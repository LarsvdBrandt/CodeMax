package com.reuzenpanda.codemax.common.amqp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class JobMessage {
    private UUID taskId;
    private UUID projectId;
    private String prompt;
    private UUID branchId;
}
