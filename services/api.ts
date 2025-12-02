import { authService } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface ApiProject {
  id: string;
  name: string;
  duration: string;
  duration_seconds: number;
  size: string;
  status: string;
  type: string;
  bpm: number;
  time_signature: number;
}

export interface ApiChordPrediction {
  timestamp: number;
  formatted_time: string;
  chord: string;
  confidence: number;
}

export interface ApiWaveformData {
  time: number;
  amplitude: number;
}

export interface UploadResponse {
  success: boolean;
  project: ApiProject;
  chords: ApiChordPrediction[];
  waveform: ApiWaveformData[];
}

export interface ProjectResponse {
  success: boolean;
  project: ApiProject;
  chords: ApiChordPrediction[];
  waveform: ApiWaveformData[];
}

export interface ProjectListItem {
  id: string;
  name: string;
  duration: string;
  size: string;
  status: string;
  type: string;
}

export interface ProjectListResponse {
  success: boolean;
  projects: ProjectListItem[];
}

export interface HealthResponse {
  status: string;
  model_status: string;
  model_exists: boolean;
}

export interface AudioUrlResponse {
  url: string;
}

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getAuthHeaders(): HeadersInit {
  const token = authService.getToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      authService.clearToken();
    }
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new ApiError(
      response.status,
      error.detail || error.error || "Request failed"
    );
  }
  return response.json();
}

export const api = {
  async uploadAudio(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
      headers: getAuthHeaders(),
    });

    return handleResponse<UploadResponse>(response);
  },

  async getProject(projectId: string): Promise<ProjectResponse> {
    const response = await fetch(`${API_BASE_URL}/api/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ProjectResponse>(response);
  },

  async deleteProject(projectId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/project/${projectId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(response);
  },

  async listProjects(): Promise<ProjectListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ProjectListResponse>(response);
  },

  async getAudioUrl(projectId: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/audio/${projectId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.clearToken();
      }
      throw new ApiError(response.status, "Failed to get audio URL");
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as AudioUrlResponse;
      return data.url;
    }

    return `${API_BASE_URL}/api/audio/${projectId}`;
  },

  async healthCheck(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse<HealthResponse>(response);
  },

  isAuthenticated(): boolean {
    return authService.isAuthenticated();
  },

  getLoginUrl(): string {
    return authService.getLoginUrl();
  },
};

export default api;
