const API_BASE_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "chordai_token";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture_url?: string;
}

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  getLoginUrl(): string {
    return `${API_BASE_URL}/auth/login`;
  },

  handleAuthCallback(): string | null {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      this.setToken(token);
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    }
    return null;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
        }
        return null;
      }

      return response.json();
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Ignore logout errors
      }
    }
    this.clearToken();
  },
};

export default authService;
