package com.reuzenpanda.codemax.tasks.pipeline.generators;

import com.reuzenpanda.codemax.tasks.pipeline.model.AppSpecification;
import com.reuzenpanda.codemax.tasks.pipeline.model.EntitySpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Deterministic — no AI call.
 * Single entity  → replaces Dashboard route in App.tsx + updates Navbar item.
 * Multiple entities → generates AppLayout.tsx with SideNav, adds all routes to App.tsx.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NavigationGenerator {

    /**
     * Called once after all entities have been generated.
     * Decides between single-entity (Navbar) and multi-entity (SideNav) layout.
     */
    public void generateAll(Path projectDir, AppSpecification spec) throws IOException {
        List<EntitySpec> entities = spec.entities();
        if (entities.isEmpty()) {
            log.warn("NavigationGenerator: no entities in spec, skipping");
            return;
        }

        if (entities.size() == 1) {
            // Single entity — simple replacement of Dashboard route + Navbar item
            patchAppRouter(projectDir, entities.get(0));
            patchNavbar(projectDir, entities.get(0));
            log.info("NavigationGenerator: single-entity mode — wired {} into App.tsx + Navbar", entities.get(0).name());
        } else {
            // Multiple entities — generate sidebar layout + all routes
            writeAppLayout(projectDir, spec);
            patchAppRouterMulti(projectDir, entities);
            log.info("NavigationGenerator: multi-entity mode — wrote AppLayout + wired {} entities", entities.size());
        }
    }

    // ── Single-entity: patch App.tsx (replace /dashboard route) ─────────────

    private void patchAppRouter(Path projectDir, EntitySpec entity) throws IOException {
        Path appTsx = projectDir.resolve("src/App.tsx");
        if (!Files.exists(appTsx)) {
            log.warn("NavigationGenerator: src/App.tsx not found, skipping");
            return;
        }

        String content  = Files.readString(appTsx);
        String pageName = entity.name() + "sPage";
        String routePath = entity.routePath();

        if (content.contains(pageName)) {
            log.debug("NavigationGenerator: {} already in App.tsx", pageName);
            return;
        }

        String[] lines = content.split("\n", -1);
        StringBuilder sb = new StringBuilder();
        boolean routeInserted = false;

        for (String line : lines) {
            String trimmed = line.trim();

            if (isDashboardImport(trimmed)) {
                String alias = trimmed.contains("@/pages/") ? "@/pages/" : "./pages/";
                if (trimmed.contains("lazy(")) {
                    sb.append(line.replace(line.trim(),
                        "const " + pageName + " = lazy(() => import('" + alias + pageName + "'))"));
                } else {
                    sb.append(line.replace(line.trim(),
                        "import " + pageName + " from '" + alias + pageName + "'"));
                }
            } else if (isDashboardRoute(trimmed)) {
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

        if (!routeInserted) {
            log.warn("NavigationGenerator: no /dashboard route found in App.tsx to replace for {}", pageName);
        }

        String updated = sb.toString();
        if (!content.endsWith("\n") && updated.endsWith("\n")) {
            updated = updated.substring(0, updated.length() - 1);
        }
        Files.writeString(appTsx, updated);
    }

    private boolean isDashboardImport(String line) {
        return (line.startsWith("import ") || line.startsWith("const "))
            && line.contains("Dashboard")
            && line.contains("/pages/Dashboard");
    }

    private boolean isDashboardRoute(String line) {
        return line.startsWith("<Route")
            && (line.contains("path=\"/dashboard\"") || line.contains("path='/dashboard'"));
    }

    // ── Single-entity: update Navbar ─────────────────────────────────────────

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

        String updated = replaceNavItem(content, navLabel, navPath);
        if (!updated.equals(content)) {
            Files.writeString(navbarPath, updated);
        } else {
            log.warn("NavigationGenerator: could not find a nav anchor in Navbar.tsx to replace");
        }
    }

    private String replaceNavItem(String content, String navLabel, String navPath) {
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
        String[] hrefPatterns = {
            "href=\"/todos\"", "href='/todos'", "href=\"/dashboard\"", "href='/dashboard'",
        };
        for (String pattern : hrefPatterns) {
            if (content.contains(pattern)) {
                return content.replace(pattern, "href=\"" + navPath + "\"");
            }
        }
        return content;
    }

    // ── Multi-entity: generate AppLayout.tsx with SideNav ────────────────────

    private void writeAppLayout(Path projectDir, AppSpecification spec) throws IOException {
        List<EntitySpec> entities = spec.entities();

        StringBuilder navItems = new StringBuilder();
        navItems.append("  { id: 'overview', label: 'Overview', href: '")
                .append(entities.get(0).routePath()).append("', icon: <LayoutDashboard className=\"h-4 w-4\" /> },\n");
        for (EntitySpec e : entities) {
            String icon = pickIcon(e.name());
            navItems.append("  { id: '").append(e.plural()).append("', label: '").append(e.name()).append("s', ")
                    .append("href: '").append(e.routePath()).append("', ")
                    .append("icon: <").append(icon).append(" className=\"h-4 w-4\" /> },\n");
        }

        String layout = """
            import { useState } from 'react'
            import { Outlet } from 'react-router-dom'
            import { SideNav } from '@/components/ui/SideNav'
            import { LayoutDashboard, Users, TrendingUp, Package, FileText, Calendar, Settings, List } from 'lucide-react'

            const NAV_ITEMS = [
            """ + navItems + """
            ]

            export default function AppLayout() {
              const [collapsed, setCollapsed] = useState(false)
              return (
                <div className="flex h-screen overflow-hidden bg-background">
                  <SideNav
                    items={NAV_ITEMS}
                    collapsed={collapsed}
                    onCollapse={setCollapsed}
                  />
                  <main className="flex-1 overflow-y-auto">
                    <Outlet />
                  </main>
                </div>
              )
            }
            """;

        Path dest = projectDir.resolve("src/layouts/AppLayout.tsx");
        Files.createDirectories(dest.getParent());
        Files.writeString(dest, layout);
        log.info("NavigationGenerator: wrote src/layouts/AppLayout.tsx");
    }

    private String pickIcon(String entityName) {
        String lower = entityName.toLowerCase();
        if (lower.contains("user") || lower.contains("lead") || lower.contains("contact") || lower.contains("customer")) return "Users";
        if (lower.contains("deal") || lower.contains("sale") || lower.contains("order") || lower.contains("revenue")) return "TrendingUp";
        if (lower.contains("product") || lower.contains("item") || lower.contains("card") || lower.contains("stock")) return "Package";
        if (lower.contains("task") || lower.contains("ticket") || lower.contains("issue")) return "List";
        if (lower.contains("article") || lower.contains("post") || lower.contains("content")) return "FileText";
        if (lower.contains("event") || lower.contains("booking") || lower.contains("appointment")) return "Calendar";
        if (lower.contains("setting") || lower.contains("config")) return "Settings";
        return "List";
    }

    // ── Multi-entity: patch App.tsx with all entity routes + AppLayout ────────

    private void patchAppRouterMulti(Path projectDir, List<EntitySpec> entities) throws IOException {
        Path appTsx = projectDir.resolve("src/App.tsx");
        if (!Files.exists(appTsx)) {
            log.warn("NavigationGenerator: src/App.tsx not found, skipping");
            return;
        }

        String content = Files.readString(appTsx);

        // Build import block for all page components
        StringBuilder imports = new StringBuilder();
        imports.append("const AppLayout = lazy(() => import('@/layouts/AppLayout'))\n");
        for (EntitySpec e : entities) {
            String pageName = e.name() + "sPage";
            if (!content.contains(pageName)) {
                imports.append("const ").append(pageName)
                       .append(" = lazy(() => import('@/pages/").append(pageName).append("'))\n");
            }
        }

        // Build route block for all entity pages inside AppLayout
        StringBuilder routes = new StringBuilder();
        routes.append("<Route element={<AppLayout />}>\n");
        for (EntitySpec e : entities) {
            String pageName = e.name() + "sPage";
            routes.append("                <Route path=\"").append(e.routePath())
                  .append("\" element={<").append(pageName).append(" />} />\n");
        }
        routes.append("              </Route>");

        // Insert imports after last existing import/const statement
        String updated = injectImports(content, imports.toString());
        // Replace the /dashboard route (or insert after ProtectedRoute opening) with our routes block
        updated = replaceDashboardWithMultiRoutes(updated, routes.toString(), entities);

        Files.writeString(appTsx, updated);
    }

    private String injectImports(String content, String newImports) {
        // Find the last lazy() import line and insert after it
        String[] lines = content.split("\n", -1);
        int lastLazyIdx = -1;
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith("const ") && lines[i].contains("lazy(")) {
                lastLazyIdx = i;
            }
        }
        if (lastLazyIdx < 0) return newImports + "\n" + content;

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i <= lastLazyIdx; i++) {
            sb.append(lines[i]).append("\n");
        }
        sb.append(newImports);
        for (int i = lastLazyIdx + 1; i < lines.length; i++) {
            sb.append(lines[i]);
            if (i < lines.length - 1) sb.append("\n");
        }
        return sb.toString();
    }

    private String replaceDashboardWithMultiRoutes(String content, String routesBlock, List<EntitySpec> entities) {
        // Try to replace the existing /dashboard route
        String[] lines = content.split("\n", -1);
        StringBuilder sb = new StringBuilder();
        boolean replaced = false;

        // Also collect existing Dashboard import line indices to remove
        for (String line : lines) {
            String trimmed = line.trim();
            if (isDashboardImport(trimmed)) {
                // Skip — we've already added new imports in injectImports
                continue;
            }
            if (!replaced && isDashboardRoute(trimmed)) {
                String indent = line.substring(0, line.length() - line.stripLeading().length());
                sb.append(indent).append(routesBlock).append("\n");
                replaced = true;
                continue;
            }
            sb.append(line).append("\n");
        }

        if (!replaced) {
            log.warn("NavigationGenerator (multi): no /dashboard route found to replace — entities may not be routed");
        }

        String result = sb.toString();
        if (!content.endsWith("\n") && result.endsWith("\n")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }
}
