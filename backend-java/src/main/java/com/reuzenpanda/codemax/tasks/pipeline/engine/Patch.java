package com.reuzenpanda.codemax.tasks.pipeline.engine;

public record Patch(
    String file,
    PatchOperation operation,
    String search,
    String replace
) {
    /** Convenience constructor for APPEND (no search needed). */
    public static Patch append(String file, String replace) {
        return new Patch(file, PatchOperation.APPEND, null, replace);
    }

    /** Convenience constructor for PREPEND (no search needed). */
    public static Patch prepend(String file, String replace) {
        return new Patch(file, PatchOperation.PREPEND, null, replace);
    }

    /** Convenience constructor for REPLACE_BLOCK. */
    public static Patch replace(String file, String search, String replace) {
        return new Patch(file, PatchOperation.REPLACE_BLOCK, search, replace);
    }

    /** Convenience constructor for INSERT_AFTER. */
    public static Patch insertAfter(String file, String search, String insert) {
        return new Patch(file, PatchOperation.INSERT_AFTER, search, insert);
    }
}
