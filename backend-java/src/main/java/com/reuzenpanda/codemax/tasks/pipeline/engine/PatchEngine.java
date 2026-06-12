package com.reuzenpanda.codemax.tasks.pipeline.engine;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Slf4j
@Service
public class PatchEngine {

    /**
     * Apply a list of patches to files in the given project directory.
     * Patches are applied in order. A missing search string causes a warning and skips
     * that patch — it does not abort the whole list.
     */
    public void apply(Path projectDir, List<Patch> patches) throws IOException {
        for (Patch patch : patches) {
            applyOne(projectDir, patch);
        }
    }

    private void applyOne(Path projectDir, Patch patch) throws IOException {
        Path target = projectDir.resolve(patch.file());
        if (!Files.exists(target)) {
            log.warn("PatchEngine: target file not found, skipping: {}", patch.file());
            return;
        }

        String content = Files.readString(target);
        String updated = switch (patch.operation()) {
            case REPLACE_BLOCK -> {
                if (!content.contains(patch.search())) {
                    log.warn("PatchEngine: search string not found in {}, skipping patch", patch.file());
                    yield content;
                }
                yield content.replace(patch.search(), patch.replace());
            }
            case INSERT_AFTER -> {
                if (!content.contains(patch.search())) {
                    log.warn("PatchEngine: insert-after anchor not found in {}, skipping", patch.file());
                    yield content;
                }
                int idx = content.indexOf(patch.search()) + patch.search().length();
                yield content.substring(0, idx) + patch.replace() + content.substring(idx);
            }
            case APPEND  -> content + patch.replace();
            case PREPEND -> patch.replace() + content;
        };

        if (!updated.equals(content)) {
            Files.writeString(target, updated);
            log.debug("PatchEngine: patched {}", patch.file());
        }
    }
}
