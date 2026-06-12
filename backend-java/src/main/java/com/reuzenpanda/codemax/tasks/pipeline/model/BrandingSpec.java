package com.reuzenpanda.codemax.tasks.pipeline.model;

import java.util.List;
import java.util.Map;

public record BrandingSpec(
    String accentColorRgb,
    String tagline,
    String heroHeadline,
    String heroSubheadline,
    List<Map<String, String>> featureItems  // [{icon, title, description}]
) {}
