package com.reuzenpanda.codemax.tasks.pipeline.engine;

import com.reuzenpanda.codemax.tasks.pipeline.model.TemplateKnowledge;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Slf4j
@Service
public class TemplateKnowledgeBuilder {

    /**
     * Scan the seeded project directory and extract template knowledge:
     * available UI components, reference model/route/page/service patterns.
     */
    public TemplateKnowledge build(Path projectDir) {
        List<String> components = scanComponents(projectDir);
        String modelPattern   = read(projectDir, "server/src/models/Todo.ts");
        String routePattern   = read(projectDir, "server/src/routes/todos.ts");
        String pagePattern    = read(projectDir, "src/pages/Dashboard.tsx");
        // On update runs Dashboard.tsx may already be deleted — fall back to first generated page
        if (pagePattern.isBlank()) {
            pagePattern = findFirstGeneratedPage(projectDir);
        }
        String servicePattern = read(projectDir, "src/services/todos.ts");

        log.info("TemplateKnowledge: {} components, model={}, route={}, page={}, service={}",
            components.size(),
            modelPattern.isBlank()   ? "missing" : "ok",
            routePattern.isBlank()   ? "missing" : "ok",
            pagePattern.isBlank()    ? "missing" : "ok",
            servicePattern.isBlank() ? "missing" : "ok");

        return new TemplateKnowledge(components, modelPattern, routePattern, pagePattern, servicePattern);
    }

    private List<String> scanComponents(Path projectDir) {
        List<String> names = new ArrayList<>();
        Path uiDir = projectDir.resolve("src/components/ui");
        if (!Files.exists(uiDir)) return names;
        try (Stream<Path> files = Files.list(uiDir)) {
            files
                .filter(p -> p.toString().endsWith(".tsx"))
                .map(p -> p.getFileName().toString().replace(".tsx", ""))
                .sorted()
                .forEach(names::add);
        } catch (IOException e) {
            log.warn("Could not scan UI components directory: {}", e.getMessage());
        }
        return names;
    }

    private String findFirstGeneratedPage(Path projectDir) {
        Path pagesDir = projectDir.resolve("src/pages");
        if (!Files.exists(pagesDir)) return "";
        try (Stream<Path> files = Files.list(pagesDir)) {
            return files
                .filter(p -> p.getFileName().toString().endsWith("Page.tsx"))
                .min(Comparator.comparing(p -> p.getFileName().toString()))
                .map(p -> { try { return Files.readString(p); } catch (IOException e) { return ""; } })
                .orElse("");
        } catch (IOException e) {
            log.warn("Could not scan pages directory for backup pattern: {}", e.getMessage());
            return "";
        }
    }

    private String read(Path projectDir, String relativePath) {
        try {
            Path p = projectDir.resolve(relativePath);
            return Files.exists(p) ? Files.readString(p) : "";
        } catch (IOException e) {
            log.warn("Could not read template file {}: {}", relativePath, e.getMessage());
            return "";
        }
    }
}
