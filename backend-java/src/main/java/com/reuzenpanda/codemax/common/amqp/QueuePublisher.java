package com.reuzenpanda.codemax.common.amqp;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QueuePublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishJob(UUID taskId, UUID projectId, String prompt) {
        rabbitTemplate.convertAndSend(AmqpConfig.AI_JOBS_QUEUE, new JobMessage(taskId, projectId, prompt));
    }
}
