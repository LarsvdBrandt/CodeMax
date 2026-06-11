package com.reuzenpanda.codemax;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@OpenAPIDefinition(
    info = @Info(
        title = "CodeMax API",
        version = "1.0.0",
        description = """
            AI-powered Next.js application builder.

            ## Glossary
            - **Project** — a generated Next.js application living in /projects/{id}
            - **Task** — a build job triggered by a user prompt, processed by the worker
            - **Pipeline** — the 12-step AI orchestration: analyze → plan → codegen → docker → auto-fix
            - **Agent log** — append-only JSON array on Task recording each pipeline step
            """,
        contact = @Contact(name = "Reuzenpanda", email = "dev@reuzenpanda.nl")
    ),
    servers = {
        @Server(url = "http://localhost:8000", description = "Local / Docker"),
    }
)
public class CodeMaxApplication {
    public static void main(String[] args) {
        SpringApplication.run(CodeMaxApplication.class, args);
    }
}
