package com.reuzenpanda.codemax.tasks.listeners;

import com.reuzenpanda.codemax.common.amqp.JobMessage;
import com.reuzenpanda.codemax.tasks.pipeline.PipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskListenerService {

    private final PipelineService pipelineService;

    public void process(JobMessage message) {
        log.info("Processing job: taskId={} projectId={}", message.getTaskId(), message.getProjectId());
        pipelineService.runPipeline(message.getTaskId(), message.getProjectId(), message.getPrompt());
    }
}
