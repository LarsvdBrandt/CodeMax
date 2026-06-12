package com.reuzenpanda.codemax.common.docker;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.model.*;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class DockerService {

    private static final String IMAGE = "node:20-alpine";
    private static final String NETWORK = "codemax_network";
    private static final String VOLUME_NAME = "codemax_projects";
    public static final int VITE_INTERNAL_PORT = 5173;

    public record PreviewResult(String containerId, int port) {}

    private final DockerClient docker;

    public DockerService() {
        var config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
        var httpClient = new ApacheDockerHttpClient.Builder()
            .dockerHost(URI.create("unix:///var/run/docker.sock"))
            .build();
        this.docker = DockerClientImpl.getInstance(config, httpClient);
    }

    public String containerName(UUID projectId) {
        return "codemax_preview_" + projectId;
    }

    /**
     * Create (or recreate) and start the preview container for a full-stack project.
     * Runs both Express (port 3000 internal) and Vite dev server (port 5173 internal).
     * Docker auto-assigns a free host port — no race condition with manual port selection.
     * Returns PreviewResult with the container ID and the actual assigned host port.
     */
    public PreviewResult provisionPreview(UUID projectId, String existingContainerId,
                                           Map<String, String> envVars) {
        if (existingContainerId != null && !existingContainerId.isBlank()) {
            try {
                docker.stopContainerCmd(existingContainerId).exec();
                docker.removeContainerCmd(existingContainerId).exec();
            } catch (Exception ignored) {}
        }

        String name = containerName(projectId);
        try { docker.removeContainerCmd(name).withForce(true).exec(); } catch (Exception ignored) {}

        String base = "/projects/" + projectId;
        String cmd = "cd " + base + "/server && npm install --silent && npm run dev & " +
                     "cd " + base + " && npm install --silent && " +
                     "VITE_PORT=" + VITE_INTERNAL_PORT + " npm run dev -- --host 0.0.0.0";

        List<String> env = new ArrayList<>();
        env.add("NODE_ENV=development");
        env.add("CHOKIDAR_USEPOLLING=true");
        env.add("VITE_PORT=" + VITE_INTERNAL_PORT);
        envVars.forEach((k, v) -> env.add(k + "=" + v));

        // Bind to port 0 — Docker will assign the next available host port automatically
        CreateContainerResponse container = docker.createContainerCmd(IMAGE)
            .withName(name)
            .withCmd("/bin/sh", "-c", cmd)
            .withEnv(env.toArray(String[]::new))
            .withHostConfig(HostConfig.newHostConfig()
                .withBinds(new Bind(VOLUME_NAME, new Volume("/projects"), AccessMode.rw, SELContext.none, true))
                .withPortBindings(PortBinding.parse("0:" + VITE_INTERNAL_PORT))
                .withNetworkMode(NETWORK)
                .withRestartPolicy(RestartPolicy.noRestart()))
            .withExposedPorts(ExposedPort.tcp(VITE_INTERNAL_PORT))
            .exec();

        docker.startContainerCmd(container.getId()).exec();

        // Inspect to find the actual host port Docker assigned
        int hostPort = resolveHostPort(container.getId());
        return new PreviewResult(container.getId(), hostPort);
    }

    private int resolveHostPort(String containerId) {
        try {
            var info = docker.inspectContainerCmd(containerId).exec();
            var bindings = info.getNetworkSettings().getPorts().getBindings();
            var portBindings = bindings.get(ExposedPort.tcp(VITE_INTERNAL_PORT));
            if (portBindings != null && portBindings.length > 0) {
                return Integer.parseInt(portBindings[0].getHostPortSpec());
            }
        } catch (Exception e) {
            log.warn("Could not resolve host port for container {}: {}", containerId, e.getMessage());
        }
        throw new IllegalStateException("Docker did not assign a host port for container " + containerId);
    }

    /** Parse a .env file into a key→value map. Lines starting with # are ignored. */
    public Map<String, String> readEnvFile(Path envFile) {
        Map<String, String> result = new java.util.LinkedHashMap<>();
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

    /** Get the last N lines of container logs. */
    public List<String> getLogs(String containerId, int lines) {
        List<String> result = new ArrayList<>();
        try {
            docker.logContainerCmd(containerId)
                .withStdOut(true)
                .withStdErr(true)
                .withTail(lines)
                .exec(new com.github.dockerjava.api.async.ResultCallback.Adapter<Frame>() {
                    @Override public void onNext(Frame frame) {
                        result.add(new String(frame.getPayload(), StandardCharsets.UTF_8).stripTrailing());
                    }
                }).awaitCompletion();
        } catch (Exception e) {
            log.warn("Failed to get container logs for {}: {}", containerId, e.getMessage());
        }
        return result;
    }

    /** Exec a command in the container and return stdout. */
    public String exec(String containerId, String... cmd) {
        try {
            var execCreate = docker.execCreateCmd(containerId)
                .withCmd(cmd)
                .withAttachStdout(true)
                .withAttachStderr(true)
                .exec();
            var output = new StringBuilder();
            docker.execStartCmd(execCreate.getId())
                .exec(new com.github.dockerjava.api.async.ResultCallback.Adapter<Frame>() {
                    @Override public void onNext(Frame frame) {
                        output.append(new String(frame.getPayload(), StandardCharsets.UTF_8));
                    }
                }).awaitCompletion();
            return output.toString();
        } catch (Exception e) {
            log.warn("Exec failed in container {}: {}", containerId, e.getMessage());
            return "";
        }
    }

    public void stopContainer(String containerId) {
        try { docker.stopContainerCmd(containerId).exec(); } catch (Exception ignored) {}
    }

    public void startContainer(String containerId) {
        try { docker.startContainerCmd(containerId).exec(); } catch (Exception ignored) {}
    }

    public void removeContainer(String containerId) {
        try { docker.removeContainerCmd(containerId).withForce(true).exec(); } catch (Exception ignored) {}
    }

    public boolean isContainerRunning(String containerId) {
        try {
            var info = docker.inspectContainerCmd(containerId).exec();
            return Boolean.TRUE.equals(info.getState().getRunning());
        } catch (Exception e) {
            return false;
        }
    }

    /** Write nginx location block for the project. */
    public void writeNginxConfig(UUID projectId, String nginxConfDir) {
        String confPath = nginxConfDir + "/previews.conf";
        String locationBlock = "\nlocation /preview/" + projectId + "/ {\n" +
            "    set $upstream codemax_preview_" + projectId + ";\n" +
            "    proxy_pass http://$upstream:3000/;\n" +
            "    proxy_set_header Host $host;\n" +
            "    proxy_set_header X-Real-IP $remote_addr;\n" +
            "}\n";
        try {
            java.nio.file.Path path = java.nio.file.Path.of(confPath);
            String existing = java.nio.file.Files.exists(path)
                ? java.nio.file.Files.readString(path)
                : "";
            String entry = "location /preview/" + projectId;
            if (!existing.contains(entry)) {
                java.nio.file.Files.writeString(path, existing + locationBlock);
            }
            // Signal nginx to reload
            exec("nginx", "nginx", "-s", "reload");
        } catch (Exception e) {
            log.warn("Failed to update nginx config: {}", e.getMessage());
        }
    }
}
