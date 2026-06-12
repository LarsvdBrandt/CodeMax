package com.reuzenpanda.codemax.tasks.pipeline.packs;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PackRegistry {

    private final ResourcePatternResolver resourceLoader;
    private final ObjectMapper objectMapper;
    private final Map<String, PackMetadata> packs = new ConcurrentHashMap<>();

    public PackRegistry(ResourcePatternResolver resourceLoader, ObjectMapper objectMapper) {
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void load() {
        try {
            Resource[] resources = resourceLoader.getResources("classpath:packs/*/pack.json");
            for (Resource r : resources) {
                try (InputStream is = r.getInputStream()) {
                    PackMetadata meta = objectMapper.readValue(is, PackMetadata.class);
                    packs.put(meta.name(), meta);
                    log.info("PackRegistry: loaded pack '{}'", meta.name());
                } catch (Exception e) {
                    log.warn("PackRegistry: failed to load {}: {}", r.getFilename(), e.getMessage());
                }
            }
            log.info("PackRegistry: {} packs available: {}", packs.size(), packs.keySet());
        } catch (Exception e) {
            log.warn("PackRegistry: could not scan packs: {}", e.getMessage());
        }
    }

    public List<PackMetadata> all() {
        return new ArrayList<>(packs.values());
    }

    public Optional<PackMetadata> get(String name) {
        return Optional.ofNullable(packs.get(name));
    }

    public String catalog() {
        return packs.values().stream()
            .map(p -> "- " + p.name() + ": " + p.description()
                + (p.tags().isEmpty() ? "" : " [tags: " + String.join(", ", p.tags()) + "]"))
            .collect(Collectors.joining("\n"));
    }
}
