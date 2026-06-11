package com.reuzenpanda.codemax.tasks.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentLogEntry {
    private String step;
    private String status;
    private String timestamp;
    private String detail;
}
