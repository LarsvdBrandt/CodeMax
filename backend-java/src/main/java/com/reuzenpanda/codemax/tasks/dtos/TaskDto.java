package com.reuzenpanda.codemax.tasks.dtos;

import com.reuzenpanda.codemax.tasks.entities.AgentLogEntry;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor
public class TaskDto {
    private UUID id;
    private String prompt;
    private String status;
    private List<AgentLogEntry> agentLog;
    private OffsetDateTime createdAt;
}
