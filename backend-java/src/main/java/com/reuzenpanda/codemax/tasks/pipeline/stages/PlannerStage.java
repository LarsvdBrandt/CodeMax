package com.reuzenpanda.codemax.tasks.pipeline.stages;

import com.reuzenpanda.codemax.tasks.pipeline.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class PlannerStage {

    /**
     * Build a deterministic execution plan for a new project.
     * Each entity gets the full set of steps.
     */
    public ExecutionPlan plan(AppSpecification spec) {
        List<ExecutionStep> steps = new ArrayList<>();
        steps.add(new ExecutionStep(StepType.GENERATE_CONTENT, null, "Write content.ts + server content.ts"));

        for (EntitySpec entity : spec.entities()) {
            steps.add(new ExecutionStep(StepType.CREATE_MODEL,       entity.name(), "Create " + entity.name() + " Mongoose model"));
            steps.add(new ExecutionStep(StepType.CREATE_ROUTE,       entity.name(), "Create " + entity.plural() + " Express routes"));
            steps.add(new ExecutionStep(StepType.UPDATE_ROUTE_INDEX, entity.name(), "Register route in server index"));
            steps.add(new ExecutionStep(StepType.CREATE_TYPES,       entity.name(), "Add TypeScript types for " + entity.name()));
            steps.add(new ExecutionStep(StepType.CREATE_SERVICE,     entity.name(), "Create " + entity.plural() + " frontend service"));
            steps.add(new ExecutionStep(StepType.UPDATE_API_CONFIG,  entity.name(), "Add API endpoint to api.ts"));
            steps.add(new ExecutionStep(StepType.CREATE_PAGE,        entity.name(), "Generate " + entity.name() + " management page"));
            steps.add(new ExecutionStep(StepType.UPDATE_APP_ROUTER,  entity.name(), "Register route in App.tsx"));
            steps.add(new ExecutionStep(StepType.UPDATE_NAVIGATION,  entity.name(), "Add nav item to Navbar"));
        }

        steps.add(new ExecutionStep(StepType.APPLY_BRANDING, null, "Apply branding to generated files"));

        log.info("PlannerStage: {} steps for {} entities", steps.size(), spec.entities().size());
        return new ExecutionPlan(steps);
    }

    /**
     * Build an incremental plan for update mode — only steps for new/changed entities.
     */
    public ExecutionPlan planUpdate(AppSpecification newSpec, AppSpecification oldSpec) {
        List<String> existingEntityNames = oldSpec.entities().stream()
            .map(EntitySpec::name).toList();

        List<EntitySpec> newEntities = newSpec.entities().stream()
            .filter(e -> !existingEntityNames.contains(e.name()))
            .toList();

        List<ExecutionStep> steps = new ArrayList<>();

        if (newEntities.isEmpty()) {
            // No new entities — only re-apply branding if spec changed
            steps.add(new ExecutionStep(StepType.GENERATE_CONTENT, null, "Re-generate content.ts (branding update)"));
            steps.add(new ExecutionStep(StepType.APPLY_BRANDING, null, "Re-apply branding"));
            log.info("PlannerStage (update): no new entities, branding-only plan");
        } else {
            steps.add(new ExecutionStep(StepType.GENERATE_CONTENT, null, "Update content.ts with new features"));
            for (EntitySpec entity : newEntities) {
                steps.add(new ExecutionStep(StepType.CREATE_MODEL,       entity.name(), "Create " + entity.name() + " Mongoose model"));
                steps.add(new ExecutionStep(StepType.CREATE_ROUTE,       entity.name(), "Create " + entity.plural() + " Express routes"));
                steps.add(new ExecutionStep(StepType.UPDATE_ROUTE_INDEX, entity.name(), "Register route in server index"));
                steps.add(new ExecutionStep(StepType.CREATE_TYPES,       entity.name(), "Add TypeScript types for " + entity.name()));
                steps.add(new ExecutionStep(StepType.CREATE_SERVICE,     entity.name(), "Create " + entity.plural() + " frontend service"));
                steps.add(new ExecutionStep(StepType.UPDATE_API_CONFIG,  entity.name(), "Add API endpoint to api.ts"));
                steps.add(new ExecutionStep(StepType.CREATE_PAGE,        entity.name(), "Generate " + entity.name() + " management page"));
                steps.add(new ExecutionStep(StepType.UPDATE_APP_ROUTER,  entity.name(), "Register route in App.tsx"));
                steps.add(new ExecutionStep(StepType.UPDATE_NAVIGATION,  entity.name(), "Add nav item to Navbar"));
            }
            steps.add(new ExecutionStep(StepType.APPLY_BRANDING, null, "Re-apply branding"));
            log.info("PlannerStage (update): {} new entities, {} steps", newEntities.size(), steps.size());
        }

        return new ExecutionPlan(steps);
    }
}
