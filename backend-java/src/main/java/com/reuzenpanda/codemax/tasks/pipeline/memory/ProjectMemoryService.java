package com.reuzenpanda.codemax.tasks.pipeline.memory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import com.reuzenpanda.codemax.tasks.pipeline.model.ExecutionPlan;
import com.reuzenpanda.codemax.tasks.pipeline.model.ProjectMemory;
import com.reuzenpanda.codemax.tasks.pipeline.model.TemplateKnowledge;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectMemoryService {

    private final ObjectMapper objectMapper;

    private static final String CODEMAX_DIR      = ".codemax";
    private static final String SPEC_FILE        = "specification.json";
    private static final String MEMORY_FILE      = "project-memory.json";
    private static final String PLAN_FILE        = "execution-plan.json";
    private static final String KNOWLEDGE_FILE   = "template-knowledge.json";

    public boolean hasMemory(Path projectDir) {
        return Files.exists(projectDir.resolve(CODEMAX_DIR).resolve(SPEC_FILE));
    }

    public ProjectMemory load(Path projectDir) throws IOException {
        Path memFile = projectDir.resolve(CODEMAX_DIR).resolve(MEMORY_FILE);
        return objectMapper.readValue(memFile.toFile(), ProjectMemory.class);
    }

    public AppSpecification loadSpecification(Path projectDir) throws IOException {
        Path specFile = projectDir.resolve(CODEMAX_DIR).resolve(SPEC_FILE);
        return objectMapper.readValue(specFile.toFile(), AppSpecification.class);
    }

    public void save(Path projectDir, AppSpecification spec, ExecutionPlan plan,
                     TemplateKnowledge knowledge, List<String> generatedFiles,
                     String lastPrompt) throws IOException {
        Path cmDir = projectDir.resolve(CODEMAX_DIR);
        Files.createDirectories(cmDir);

        ProjectMemory memory = new ProjectMemory(spec, plan, generatedFiles,
            OffsetDateTime.now(), lastPrompt);

        write(cmDir.resolve(SPEC_FILE),       spec);
        write(cmDir.resolve(MEMORY_FILE),     memory);
        write(cmDir.resolve(PLAN_FILE),       plan);
        write(cmDir.resolve(KNOWLEDGE_FILE),  knowledge);
        log.info("Project memory saved to {}", cmDir);
    }

    private void write(Path file, Object value) throws IOException {
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), value);
    }
}
