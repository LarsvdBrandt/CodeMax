package com.reuzenpanda.codemax.tasks.pipeline.generators;

import com.reuzenpanda.codemax.tasks.pipeline.engine.Patch;
import com.reuzenpanda.codemax.tasks.pipeline.engine.PatchEngine;
import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import com.reuzenpanda.codemax.tasks.pipeline.model.EntitySpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic — no AI call. Patches App.tsx and Navbar.tsx to add the new entity route and nav item.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NavigationGenerator {

    private final PatchEngine patchEngine;

    public void generate(Path projectDir, AppSpecification spec, EntitySpec entity) throws IOException {
        patchAppRouter(projectDir, entity);
        patchNavbar(projectDir, entity);
        log.info("NavigationGenerator: wired {} into App.tsx + Navbar", entity.name());
    }

    // ── App.tsx patching ──────────────────────────────────────────────────────

    private void patchAppRouter(Path projectDir, EntitySpec entity) throws IOException {
        Path appTsx = projectDir.resolve("src/App.tsx");
        if (!Files.exists(appTsx)) {
            log.warn("NavigationGenerator: src/App.tsx not found, skipping router patch");
            return;
        }

        String content = Files.readString(appTsx);
        String pageName  = entity.name() + "sPage";
        String importLine = "import " + pageName + " from './pages/" + pageName + "'";

        // Skip if already patched
        if (content.contains(importLine)) {
            log.debug("NavigationGenerator: {} already imported in App.tsx", pageName);
            return;
        }

        List<Patch> patches = new ArrayList<>();

        // Add import after last existing page import
        String importAnchor = findLastPageImport(content);
        if (importAnchor != null) {
            patches.add(Patch.insertAfter("src/App.tsx", importAnchor, "\n" + importLine));
        } else {
            // Fallback: prepend import at the top
            patches.add(Patch.prepend("src/App.tsx", importLine + "\n"));
        }

        // Add route inside the authenticated routes block
        // Find the Dashboard route to insert after it
        String dashboardRoute = findDashboardRoute(content);
        if (dashboardRoute != null) {
            String newRoute = "\n          <Route path=\"" + entity.routePath() +
                "\" element={<" + pageName + " />} />";
            patches.add(Patch.insertAfter("src/App.tsx", dashboardRoute, newRoute));
        } else {
            log.warn("NavigationGenerator: could not find Dashboard route anchor in App.tsx");
        }

        patchEngine.apply(projectDir, patches);
    }

    private String findLastPageImport(String content) {
        String[] lines = content.split("\n");
        String last = null;
        for (String line : lines) {
            if (line.startsWith("import") && line.contains("from './pages/")) {
                last = line;
            }
        }
        return last;
    }

    private String findDashboardRoute(String content) {
        // Look for a Route with path="/dashboard" or similar
        String[] patterns = {
            "path=\"/dashboard\"",
            "path='/dashboard'",
            "path=\"/\"",
        };
        for (String p : patterns) {
            int idx = content.indexOf(p);
            if (idx >= 0) {
                int end = content.indexOf("/>", idx);
                if (end >= 0) return content.substring(idx - 8, end + 2); // include <Route prefix
            }
        }
        return null;
    }

    // ── Navbar.tsx patching ───────────────────────────────────────────────────

    private void patchNavbar(Path projectDir, EntitySpec entity) throws IOException {
        Path navbarPath = projectDir.resolve("src/components/layout/Navbar.tsx");
        if (!Files.exists(navbarPath)) {
            log.warn("NavigationGenerator: Navbar.tsx not found, skipping");
            return;
        }

        String content = Files.readString(navbarPath);
        String navLabel = entity.name() + "s";
        String navPath  = entity.routePath();

        if (content.contains(navPath)) {
            log.debug("NavigationGenerator: {} already in Navbar", navLabel);
            return;
        }

        // Look for the existing nav links array/list
        String anchor = findNavAnchor(content);
        if (anchor == null) {
            log.warn("NavigationGenerator: could not find nav anchor in Navbar.tsx");
            return;
        }

        // Detect the nav link format used in the existing file
        boolean usesTo  = content.contains("to=\"/");
        boolean usesHref = content.contains("href=\"/");

        String newNavItem;
        if (usesTo) {
            newNavItem = "\n          <NavLink to=\"" + navPath + "\">" + navLabel + "</NavLink>";
        } else if (usesHref) {
            newNavItem = "\n          <a href=\"" + navPath + "\">" + navLabel + "</a>";
        } else {
            newNavItem = "\n          <li><a href=\"" + navPath + "\">" + navLabel + "</a></li>";
        }

        patchEngine.apply(projectDir, List.of(Patch.insertAfter("src/components/layout/Navbar.tsx", anchor, newNavItem)));
    }

    private String findNavAnchor(String content) {
        String[] candidates = {
            "to=\"/dashboard\"",
            "href=\"/dashboard\"",
            "to=\"/todos\"",
            "href=\"/todos\"",
        };
        for (String c : candidates) {
            int idx = content.indexOf(c);
            if (idx >= 0) {
                int end = content.indexOf(">", idx + c.length());
                if (end >= 0) return content.substring(idx, end + 1);
            }
        }
        return null;
    }
}
