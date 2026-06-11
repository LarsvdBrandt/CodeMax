package com.reuzenpanda.codemax.tasks.listeners;

import com.reuzenpanda.codemax.common.amqp.AmqpConfig;
import com.reuzenpanda.codemax.common.amqp.JobMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TaskListener {

    private final TaskListenerService taskListenerService;

    @RabbitListener(queues = AmqpConfig.AI_JOBS_QUEUE)
    public void onMessage(JobMessage message) {
        log.info("Received job from queue: taskId={}", message.getTaskId());
        try {
            taskListenerService.process(message);
        } catch (Exception e) {
            log.error("Task failed: taskId={} error={}", message.getTaskId(), e.getMessage(), e);
            // Don't rethrow — prevents message from being requeued infinitely
        }
    }
}
