package com.reuzenpanda.codemax.common.docker;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.reuzenpanda.codemax.common.config.CodeMaxProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DockerService {

    public record PreviewResult(String containerId, int port) {}

    private final DockerClient docker;
    private final CodeMaxProperties props;

    public DockerService(CodeMaxProperties props) {
        this.props = props;
        var config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
        var httpClient = new ApacheDockerHttpClient.Builder()
            .dockerHost(URI.create("unix:///var/run/docker.sock"))
            .build();
        this.docker = DockerClientImpl.getInstance(config, httpClient);
    }

    // ── Container/resource naming ──────────────────────────────────────────────

    /** Returns the compose project name for a given project. Stored as containerId in DB. */
    public String containerName(UUID projectId) {
        return "codemax-" + projectId;
    }

    // ── Provision ─────────────────────────────────────────────────────────────

    /**
     * Runs `docker compose up --build` for the project. Creates a 4-container stack:
     * nginx (host port) → frontend:5173 + backend:3000 → mongo:27017
     * Containers appear grouped in Docker Desktop under the compose project name.
     */
    public PreviewResult provisionPreview(UUID projectId, String existingContainerId,
                                          String jwtSecret, String appName, String dbName) {
        Path projectDir = Path.of(props.getProjectsDir(), projectId.toString());
        String projectName = containerName(projectId);
        int nginxPort = findFreePort();

        // Tear down any previous stack for this project
        runComposeSilent(projectDir, projectName, "down", "--volumes", "--remove-orphans");

        // Write .env — docker compose reads this automatically from the project dir
        writeComposeEnv(projectDir, nginxPort, jwtSecret, appName, dbName, projectName);

        // Build all images and start all 4 containers
        runCompose(projectDir, projectName, "up", "-d", "--build");

        log.info("DockerService: project {} running on nginx port {}", projectId, nginxPort);
        return new PreviewResult(projectName, nginxPort);
    }

    // ── Container lifecycle ────────────────────────────────────────────────────

    public void stopContainer(String name) {
        runComposeSilent(resolveDir(name), name, "stop");
    }

    public void startContainer(String name) {
        runComposeSilent(resolveDir(name), name, "start");
    }

    public void removeContainer(String name) {
        runComposeSilent(resolveDir(name), name, "down", "--volumes");
    }

    public boolean isContainerRunning(String name) {
        // name is the compose project name; nginx container is named {name}_nginx
        String nginxContainer = name + "_nginx";
        try {
            var info = docker.inspectContainerCmd(nginxContainer).exec();
            return Boolean.TRUE.equals(info.getState().getRunning());
        } catch (Exception e) {
            return false;
        }
    }

    // ── Logs ───────────────────────────────────────────────────────────────────

    /** Returns logs from the backend service — where TypeScript/API errors appear. */
    public List<String> getLogs(String containerIdentifier, int lines) {
        Path dir = resolveDir(containerIdentifier);
        if (dir == null) return List.of();
        return runComposeCapture(dir, containerIdentifier,
            "logs", "--tail=" + lines, "--no-color", "backend");
    }

    // ── Health check ───────────────────────────────────────────────────────────

    /** Checks /api/health via nginx on the given host port. Uses host.docker.internal
     *  because the Java container cannot reach host ports via localhost. */
    public boolean isHealthy(int nginxPort) {
        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).build();
            HttpRequest req = HttpRequest.newBuilder(
                URI.create("http://host.docker.internal:" + nginxPort + "/api/health"))
                .GET().timeout(Duration.ofSeconds(5)).build();
            return client.send(req, HttpResponse.BodyHandlers.discarding()).statusCode() < 500;
        } catch (Exception e) {
            return false;
        }
    }

    // ── Env file reader ────────────────────────────────────────────────────────

    public Map<String, String> readEnvFile(Path envFile) {
        Map<String, String> result = new LinkedHashMap<>();
        if (!Files.exists(envFile)) return result;
        try {
            Files.readAllLines(envFile).forEach(line -> {
                String trimmed = line.trim();
                if (trimmed.isBlank() || trimmed.startsWith("#")) return;
                int eq = trimmed.indexOf('=');
                if (eq < 0) return;
                String key = trimmed.substring(0, eq).trim();
                String val = trimmed.substring(eq + 1).trim();
                if (!key.isBlank()) result.put(key, val);
            });
        } catch (IOException e) {
            log.warn("Could not read env file {}: {}", envFile, e.getMessage());
        }
        return result;
    }

    // ── Exec (used by auto-fix loop) ───────────────────────────────────────────

    public String exec(String containerId, String... cmd) {
        try {
            var execCreate = docker.execCreateCmd(containerId)
                .withCmd(cmd).withAttachStdout(true).withAttachStderr(true).exec();
            var output = new StringBuilder();
            docker.execStartCmd(execCreate.getId())
                .exec(new com.github.dockerjava.api.async.ResultCallback.Adapter<
                          com.github.dockerjava.api.model.Frame>() {
                    @Override public void onNext(com.github.dockerjava.api.model.Frame frame) {
                        output.append(new String(frame.getPayload(), StandardCharsets.UTF_8));
                    }
                }).awaitCompletion();
            return output.toString();
        } catch (Exception e) {
            log.warn("Exec failed in {}: {}", containerId, e.getMessage());
            return "";
        }
    }

    // ── No-op stub (previously wrote per-project nginx config) ─────────────────

    public void writeNginxConfig(UUID projectId, String nginxConfDir) {
        // Each project now has its own nginx container; no shared config needed.
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void writeComposeEnv(Path dir, int nginxPort, String jwtSecret,
                                 String appName, String dbName, String projectName) {
        String content = "NGINX_PORT=" + nginxPort + "\n"
            + "MONGO_DB_NAME=" + dbName + "\n"
            + "JWT_SECRET=" + jwtSecret + "\n"
            + "APP_NAME=" + appName + "\n"
            + "COMPOSE_PROJECT_NAME=" + projectName + "\n"
            + "NODE_ENV=development\n";
        try {
            Files.writeString(dir.resolve(".env"), content);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write compose .env: " + e.getMessage(), e);
        }
    }

    private void runCompose(Path dir, String projectName, String... args) {
        if (dir == null) return;
        List<String> cmd = new ArrayList<>(List.of("docker", "compose", "-p", projectName));
        cmd.addAll(Arrays.asList(args));
        log.info("DockerService: {}", String.join(" ", cmd));
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd)
                .directory(dir.toFile())
                .redirectErrorStream(true);
            Process p = pb.start();
            try (var reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                reader.lines().forEach(line -> log.info("[{}] {}", projectName, line));
            }
            int exit = p.waitFor();
            if (exit != 0) {
                throw new RuntimeException(
                    "docker compose " + String.join(" ", args) + " exited " + exit);
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("docker compose failed: " + e.getMessage(), e);
        }
    }

    private void runComposeSilent(Path dir, String projectName, String... args) {
        if (dir == null) return;
        try { runCompose(dir, projectName, args); }
        catch (Exception e) { log.debug("compose silent {}: {}", projectName, e.getMessage()); }
    }

    private List<String> runComposeCapture(Path dir, String projectName, String... args) {
        if (dir == null) return List.of();
        List<String> cmd = new ArrayList<>(List.of("docker", "compose", "-p", projectName));
        cmd.addAll(Arrays.asList(args));
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd)
                .directory(dir.toFile())
                .redirectErrorStream(true);
            Process p = pb.start();
            List<String> lines;
            try (var reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                lines = reader.lines().collect(Collectors.toList());
            }
            p.waitFor();
            return lines;
        } catch (Exception e) {
            log.warn("compose capture failed for {}: {}", projectName, e.getMessage());
            return List.of();
        }
    }

    private Path resolveDir(String projectName) {
        UUID id = extractProjectId(projectName);
        return id == null ? null : Path.of(props.getProjectsDir(), id.toString());
    }

    private UUID extractProjectId(String name) {
        if (name == null || !name.startsWith("codemax-")) return null;
        try { return UUID.fromString(name.substring("codemax-".length())); }
        catch (Exception ignored) { return null; }
    }

    private int findFreePort() {
        try (ServerSocket s = new ServerSocket(0)) { return s.getLocalPort(); }
        catch (IOException e) { throw new RuntimeException("No free port available", e); }
    }
}
