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

// Refreshes the HS256 JWT from the active Better Auth session and stores it.
// Call this once after sign-in and whenever the token may have expired.
export async function refreshApiToken(): Promise<string | null> {
  const res = await fetch("/api/get-api-token", { credentials: "include" });
  if (!res.ok) return null;
  const { token } = await res.json();
  localStorage.setItem("token", token);
  return token;
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

export async function createProject(
  name: string,
  description: string,
  answers?: Record<string, string>
): Promise<{ task_id: string; project_id: string }> {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description, answers }),
  });
}

export interface Question {
  id: string;
  type: "text" | "quick_menu" | "color_picker";
  question: string;
  placeholder?: string;
  options?: { value: string; label: string; hex?: string }[];
}

export async function getProjectQuestions(description: string): Promise<{ questions: Question[] }> {
  return request("/projects/questions", {
    method: "POST",
    body: JSON.stringify({ description }),
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

// User profile is managed via Better Auth (same PostgreSQL table).
// These helpers call Better Auth's own API endpoints to keep the existing UserProfile shape.

export async function getMe(): Promise<UserProfile> {
  const res = await fetch("/auth/get-session", { credentials: "include" });
  if (!res.ok) throw new ApiError(res.status, "Not authenticated");
  const { user: u } = await res.json();
  if (!u) throw new ApiError(401, "Not authenticated");
  return {
    id: u.id,
    email: u.email,
    full_name: u.fullName ?? null,
    company_name: u.companyName ?? null,
    company_address: u.companyAddress ?? null,
    company_city: u.companyCity ?? null,
    company_country: u.companyCountry ?? null,
    website: u.website ?? null,
    bio: u.bio ?? null,
    created_at: typeof u.createdAt === "string" ? u.createdAt : new Date(u.createdAt).toISOString(),
  };
}

export async function updateMe(
  data: Partial<Omit<UserProfile, "id" | "email" | "created_at">>
): Promise<UserProfile> {
  const payload: Record<string, unknown> = {};
  if (data.full_name !== undefined) { payload.name = data.full_name ?? ""; payload.fullName = data.full_name; }
  if (data.company_name !== undefined) payload.companyName = data.company_name;
  if (data.company_address !== undefined) payload.companyAddress = data.company_address;
  if (data.company_city !== undefined) payload.companyCity = data.company_city;
  if (data.company_country !== undefined) payload.companyCountry = data.company_country;
  if (data.website !== undefined) payload.website = data.website;
  if (data.bio !== undefined) payload.bio = data.bio;
  const res = await fetch("/auth/update-user", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.message ?? "Update failed");
  }
  return getMe();
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  const res = await fetch("/auth/change-password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: current_password, newPassword: new_password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.message ?? "Failed to change password");
  }
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
