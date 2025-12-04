import { authService } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface ApiPlaylist {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ApiAudioTrack {
  id: string;
  playlist_id: string;
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

export interface UploadResponse {
  success: boolean;
  track: ApiAudioTrack;
  chords: ApiChordPrediction[];
}

export interface TrackResponse {
  success: boolean;
  track: ApiAudioTrack;
  chords: ApiChordPrediction[];
}

export interface PlaylistResponse {
  success: boolean;
  playlist: ApiPlaylist;
  tracks: ApiAudioTrack[];
}

export interface PlaylistListItem {
  id: string;
  name: string;
  track_count: number;
  created_at: string;
}

export interface PlaylistListResponse {
  success: boolean;
  playlists: PlaylistListItem[];
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
    playlistId?: string,
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (playlistId) {
      formData.append("playlist_id", playlistId);
    }

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
      headers: getAuthHeaders(),
    });

    return handleResponse<UploadResponse>(response);
  },

  async getTrack(trackId: string): Promise<TrackResponse> {
    const response = await fetch(`${API_BASE_URL}/api/track/${trackId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<TrackResponse>(response);
  },

  async deleteTrack(trackId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/track/${trackId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(response);
  },

  async createPlaylist(name: string): Promise<PlaylistResponse> {
    const response = await fetch(`${API_BASE_URL}/api/playlist`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    return handleResponse<PlaylistResponse>(response);
  },

  async getPlaylist(playlistId: string): Promise<PlaylistResponse> {
    const response = await fetch(`${API_BASE_URL}/api/playlist/${playlistId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<PlaylistResponse>(response);
  },

  async updatePlaylist(playlistId: string, name: string): Promise<PlaylistResponse> {
    const response = await fetch(`${API_BASE_URL}/api/playlist/${playlistId}`, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    return handleResponse<PlaylistResponse>(response);
  },

  async deletePlaylist(playlistId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/playlist/${playlistId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(response);
  },

  async listPlaylists(): Promise<PlaylistListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/playlists`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<PlaylistListResponse>(response);
  },

  async getAudioUrl(trackId: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/audio/${trackId}`, {
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

    return `${API_BASE_URL}/api/audio/${trackId}`;
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
