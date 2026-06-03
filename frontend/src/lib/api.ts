const BASE = "/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function register(email: string, password: string): Promise<{ access_token: string }> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<{ access_token: string }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "idle" | "building" | "ready" | "error";
  preview_port: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  file_path: string;
  content: string;
  updated_at: string;
}

export interface AgentLogEntry {
  step: string;
  status: string;
  timestamp: string;
  detail: string;
}

export interface TaskRecord {
  id: string;
  prompt: string;
  status: string;
  agent_log: AgentLogEntry[];
  created_at: string;
}

export interface ProjectStatus {
  status: string;
  preview_port: number | null;
  task: {
    id: string;
    status: string;
    agent_log: AgentLogEntry[];
  } | null;
}

export async function listProjects(): Promise<Project[]> {
  return request("/projects");
}

export async function createProject(name: string, description: string): Promise<{ task_id: string; project_id: string }> {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function getProject(id: string): Promise<Project> {
  return request(`/projects/${id}`);
}

export async function getProjectStatus(id: string): Promise<ProjectStatus> {
  return request(`/projects/${id}/status`);
}

export async function sendPrompt(id: string, prompt: string): Promise<{ task_id: string }> {
  return request(`/projects/${id}/prompt`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function retryProject(id: string): Promise<{ task_id: string }> {
  return request(`/projects/${id}/retry`, { method: "POST" });
}

export async function listTasks(id: string): Promise<TaskRecord[]> {
  return request(`/projects/${id}/tasks`);
}

export async function stopPreview(id: string): Promise<void> {
  return request(`/projects/${id}/stop`, { method: "POST" });
}

export async function startPreview(id: string): Promise<void> {
  return request(`/projects/${id}/start`, { method: "POST" });
}

export async function getPreviewLogs(id: string): Promise<{ lines: string[] }> {
  return request(`/projects/${id}/logs`);
}

export async function updateFile(projectId: string, filePath: string, content: string): Promise<void> {
  return request(`/projects/${projectId}/files/${filePath}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export async function listFiles(id: string): Promise<ProjectFile[]> {
  return request(`/projects/${id}/files`);
}

export async function getFile(projectId: string, filePath: string): Promise<ProjectFile> {
  return request(`/projects/${projectId}/files/${filePath}`);
}

export async function deleteProject(projectId: string): Promise<void> {
  return request(`/projects/${projectId}`, { method: "DELETE" });
}

export async function renameProject(id: string, name: string): Promise<Project> {
  return request(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

// ─── User / settings ─────────────────────────────────────────────────────────

export interface UserProfile {
  id: string; email: string; full_name: string | null;
  company_name: string | null; company_address: string | null;
  company_city: string | null; company_country: string | null;
  website: string | null; bio: string | null; created_at: string;
}

export interface ApiKey {
  id: string; name: string; service: string; key_preview: string; created_at: string;
}

export async function getMe(): Promise<UserProfile> {
  return request("/auth/me");
}

export async function updateMe(data: Partial<Omit<UserProfile, "id"|"email"|"created_at">>): Promise<UserProfile> {
  return request("/auth/me", { method: "PUT", body: JSON.stringify(data) });
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  return request("/auth/me/password", { method: "POST", body: JSON.stringify({ current_password, new_password }) });
}

export async function listApiKeys(): Promise<ApiKey[]> {
  return request("/auth/api-keys");
}

export async function createApiKey(name: string, service: string, key_value: string): Promise<ApiKey> {
  return request("/auth/api-keys", { method: "POST", body: JSON.stringify({ name, service, key_value }) });
}

export async function deleteApiKey(id: string): Promise<void> {
  return request(`/auth/api-keys/${id}`, { method: "DELETE" });
}

export interface ClarifyResult {
  needs_clarification: boolean;
  question?: string;
  suggestions?: string[];
}

export interface MissingKey {
  env_var: string;
  service: string;
  description: string;
}

export async function detectKeys(projectId: string, prompt: string): Promise<{ missing: MissingKey[] }> {
  return request(`/projects/${projectId}/detect_keys`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function provideApiKey(projectId: string, env_var: string, key_value: string, service: string): Promise<void> {
  return request(`/projects/${projectId}/provide_key`, {
    method: "POST",
    body: JSON.stringify({ env_var, key_value, service }),
  });
}

export async function clarifyPrompt(projectId: string, prompt: string, context?: string): Promise<ClarifyResult> {
  return request(`/projects/${projectId}/clarify`, {
    method: "POST",
    body: JSON.stringify({ prompt, context }),
  });
}

export async function generatePlan(description: string): Promise<{ plan: string }> {
  return request("/projects/planning", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}
