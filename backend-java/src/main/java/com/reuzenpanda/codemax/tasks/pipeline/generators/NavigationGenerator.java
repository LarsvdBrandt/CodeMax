package com.reuzenpanda.codemax.tasks.pipeline.generators;

import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import com.reuzenpanda.codemax.tasks.pipeline.model.EntitySpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Deterministic — no AI call. Rewrites App.tsx imports/routes and patches Navbar.tsx nav items.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NavigationGenerator {

    public void generate(Path projectDir, AppSpecification spec, EntitySpec entity) throws IOException {
        patchAppRouter(projectDir, entity);
        patchNavbar(projectDir, entity);
        log.info("NavigationGenerator: wired {} into App.tsx + Navbar", entity.name());
    }

    // ── App.tsx: line-by-line replacement ─────────────────────────────────────

    private void patchAppRouter(Path projectDir, EntitySpec entity) throws IOException {
        Path appTsx = projectDir.resolve("src/App.tsx");
        if (!Files.exists(appTsx)) {
            log.warn("NavigationGenerator: src/App.tsx not found, skipping");
            return;
        }

        String content   = Files.readString(appTsx);
        String pageName  = entity.name() + "sPage";
        String routePath = entity.routePath();

        if (content.contains(pageName)) {
            log.debug("NavigationGenerator: {} already in App.tsx", pageName);
            return;
        }

        /*
         * Process line-by-line to avoid the substring-search bug where `/>` inside
         * `element={<Dashboard />}` is mistaken for the closing of the Route element.
         *
         * Strategy:
         *  - Dashboard import line  → replace with new page import
         *  - /dashboard route line  → replace with new entity route
         *  - Anything else          → keep as-is
         *
         * This also handles the case where Dashboard.tsx has been deleted:
         * removing its import prevents a "module not found" Vite error.
         */
        String[] lines = content.split("\n", -1);
        StringBuilder sb = new StringBuilder();
        boolean routeInserted = false;

        for (String line : lines) {
            String trimmed = line.trim();

            // Replace Dashboard import (direct or lazy, @/pages/ or ./pages/ alias)
            if (isDashboardImport(trimmed)) {
                if (trimmed.contains("lazy(")) {
                    // Preserve whichever alias style (@/ vs ./) the template uses
                    String alias = trimmed.contains("@/pages/") ? "@/pages/" : "./pages/";
                    sb.append(line.replace(line.trim(),
                        "const " + pageName + " = lazy(() => import('" + alias + pageName + "'))"));
                } else {
                    String alias = trimmed.contains("@/pages/") ? "@/pages/" : "./pages/";
                    sb.append(line.replace(line.trim(),
                        "import " + pageName + " from '" + alias + pageName + "'"));
                }

            // Replace /dashboard route line
            } else if (isDashboardRoute(trimmed)) {
                // Preserve leading indentation from the original line
                String indent = line.substring(0, line.length() - line.stripLeading().length());
                sb.append(indent)
                  .append("<Route path=\"").append(routePath)
                  .append("\" element={<").append(pageName).append(" />} />");
                routeInserted = true;

            } else {
                sb.append(line);
            }

            sb.append("\n");
        }

        // If no dashboard route was found to replace, append a reminder comment
        if (!routeInserted) {
            log.warn("NavigationGenerator: no /dashboard route found in App.tsx to replace — " +
                "add <Route path=\"{}\" element={{<{} />}} /> manually", routePath, pageName);
        }

        // Trim trailing extra newline only if original didn't end with one
        String updated = sb.toString();
        if (!content.endsWith("\n") && updated.endsWith("\n")) {
            updated = updated.substring(0, updated.length() - 1);
        }

        Files.writeString(appTsx, updated);
    }

    private boolean isDashboardImport(String line) {
        // Match both:  import Dashboard from './pages/Dashboard'
        //              const Dashboard = lazy(() => import('@/pages/Dashboard'))
        return (line.startsWith("import ") || line.startsWith("const "))
            && line.contains("Dashboard")
            && line.contains("/pages/Dashboard");   // matches @/pages/ and ./pages/
    }

    private boolean isDashboardRoute(String line) {
        return line.startsWith("<Route")
            && (line.contains("path=\"/dashboard\"") || line.contains("path='/dashboard'"));
    }

    // ── Navbar.tsx patching ───────────────────────────────────────────────────

    private void patchNavbar(Path projectDir, EntitySpec entity) throws IOException {
        Path navbarPath = projectDir.resolve("src/components/layout/Navbar.tsx");
        if (!Files.exists(navbarPath)) {
            log.warn("NavigationGenerator: Navbar.tsx not found, skipping");
            return;
        }

        String content  = Files.readString(navbarPath);
        String navLabel = entity.name() + "s";
        String navPath  = entity.routePath();

        if (content.contains(navPath)) {
            log.debug("NavigationGenerator: {} already in Navbar", navLabel);
            return;
        }

        /*
         * The Navbar uses a NAV_ITEMS array like:
         *   { label: 'Work', section: 'work' }
         *   { label: 'Work', href: '/work' }
         *
         * Replace the 'Work' scroll-spy entry (which points at the landing page section)
         * with the new entity's app route. If not found, append to the array.
         */
        String updated = replaceNavItem(content, navLabel, navPath);
        if (!updated.equals(content)) {
            Files.writeString(navbarPath, updated);
        } else {
            log.warn("NavigationGenerator: could not find a nav anchor in Navbar.tsx to replace");
        }
    }

    private String replaceNavItem(String content, String navLabel, String navPath) {
        // Replace the Work section nav item (landing page section that the feature page replaces)
        String[] workPatterns = {
            "{ label: 'Work',     section: 'work'     }",
            "{ label: 'Work', section: 'work' }",
            "{ label: \"Work\",     section: \"work\"     }",
            "{ label: \"Work\", section: \"work\" }",
        };
        for (String pattern : workPatterns) {
            if (content.contains(pattern)) {
                return content.replace(pattern,
                    "{ label: '" + navLabel + "', href: '" + navPath + "' }");
            }
        }

        // Fallback: replace any todos/dashboard href in the nav
        String[] hrefPatterns = {
            "href=\"/todos\"",
            "href='/todos'",
            "href=\"/dashboard\"",
            "href='/dashboard'",
        };
        for (String pattern : hrefPatterns) {
            if (content.contains(pattern)) {
                return content.replace(pattern, "href=\"" + navPath + "\"");
            }
        }

        return content;
    }
}
