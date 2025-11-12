// Authentication API client for FastAPI backend

export interface User {
  id: number;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  avatar_url?: string;
  role: "client" | "operator" | "admin";
  auth_provider: "email" | "phone" | "google" | "facebook";
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  requires_verification?: boolean;
  verification_sent_to?: string;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  access_token?: string;
}

export interface AuthUrlResponse {
  auth_url: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export class AuthAPIClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // Use Next.js API proxy for Replit environment
    if (typeof window !== 'undefined') {
      // Browser environment - use relative URLs to leverage Next.js proxy
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        this.baseUrl = backendUrl;
      } else {
        // Use relative URLs for Next.js API proxy (configured in next.config.mjs)
        this.baseUrl = '';
      }
      
      // Load existing token from localStorage
      this.loadTokenFromStorage();
    } else {
      // Server-side rendering - use localhost for Next.js proxy
      this.baseUrl = '';
    }
  }
  
  loadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth-token');
    }
  }

  async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    includeAuth = false
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    const startedAt = Date.now();
    const requestId = Math.random().toString(36).slice(2, 8);
    try {
      console.debug(
        "[authAPI.makeRequest]",
        JSON.stringify({ method, endpoint, includeAuth, hasToken: Boolean(this.token), requestId }),
      );
    } catch {}
    
    const headers: Record<string, string> = {};

    // Auto-detect FormData - don't set Content-Type for FormData (browser will set multipart/form-data)
    const isFormData = data instanceof FormData;
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      if (isFormData) {
        config.body = data; // Send FormData directly
      } else {
        config.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(url, config);
      const duration = Date.now() - startedAt;
      try {
        console.debug(
          "[authAPI.makeRequest:response]",
          JSON.stringify({ endpoint, status: response.status, ok: response.ok, durationMs: duration, requestId }),
        );
      } catch {}
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        try {
          console.error(
            "[authAPI.makeRequest:error]",
            JSON.stringify({ endpoint, status: response.status, error: errorData, requestId }),
          );
        } catch {}
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      try {
        console.error(
          "[authAPI.makeRequest:exception]",
          JSON.stringify({ endpoint, message: (error as Error)?.message, stack: (error as Error)?.stack?.split('\n')[0], requestId }),
        );
      } catch {}
      throw error;
    }
  }

  // Email/Password Authentication
  async register(email: string, password: string, firstName?: string, lastName?: string): Promise<ApiResponse<AuthResponse>> {
    try {
      const tokenResponse = await this.makeRequest<AuthResponse>('POST', '/auth/register', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        auth_provider: 'email'
      });
      
      if (tokenResponse.access_token) {
        this.token = tokenResponse.access_token;
        // Store token in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth-token', tokenResponse.access_token);
          try {
            // Persist in cookie for middleware (httpOnly cannot be set client-side)
            document.cookie = `auth-token=${tokenResponse.access_token}; Path=/; SameSite=Lax`;
          } catch {}
        }
        
        // Backend returns complete AuthResponse
        return { data: tokenResponse, error: null };
      }
      
      return { data: null, error: 'Registration failed' };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    try {
      const tokenResponse = await this.makeRequest<AuthResponse>('POST', '/auth/login', {
        email,
        password
      });
      
      if (tokenResponse.access_token) {
        this.token = tokenResponse.access_token;
        // Store token in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth-token', tokenResponse.access_token);
          try {
            // Persist in cookie for middleware (httpOnly cannot be set client-side)
            document.cookie = `auth-token=${tokenResponse.access_token}; Path=/; SameSite=Lax`;
            if (tokenResponse.user?.role) {
              document.cookie = `auth-role=${tokenResponse.user.role}; Path=/; SameSite=Lax`;
            }
          } catch {}
        }
        try {
          console.info(
            "[authAPI.login]",
            JSON.stringify({ userId: tokenResponse.user?.id, role: tokenResponse.user?.role, hasToken: true }),
          );
        } catch {}
        
        // Backend returns complete AuthResponse
        return { data: tokenResponse, error: null };
      }
      
      return { data: null, error: 'Login failed' };
    } catch (error) {
      try {
        console.error("[authAPI.login:error]", (error as Error)?.message);
      } catch {}
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }

  // Phone/SMS Authentication
  async startPhoneLogin(phone: string): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.makeRequest<AuthResponse>('POST', '/auth/login/phone', {
        phone
      });
      
      if (response.access_token) {
        this.token = response.access_token;
      }
      
      return { data: response, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Phone login failed' 
      };
    }
  }

  // Email Code Authentication
  async startEmailLogin(email: string): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.makeRequest<AuthResponse>('POST', '/auth/login/email', {
        email
      });
      
      if (response.access_token) {
        this.token = response.access_token;
      }
      
      return { data: response, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Email login failed' 
      };
    }
  }

  // Verification Code
  async verifyCode(userId: number, code: string, codeType: 'sms' | 'email'): Promise<ApiResponse<VerificationResponse>> {
    try {
      const response = await this.makeRequest<VerificationResponse>('POST', '/auth/verify', {
        user_id: userId,
        code,
        code_type: codeType
      });
      
      if (response.access_token) {
        this.token = response.access_token;
      }
      
      return { data: response, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Verification failed' 
      };
    }
  }

  // Google OAuth
  async getGoogleAuthUrl(): Promise<ApiResponse<AuthUrlResponse>> {
    try {
      const response = await this.makeRequest<AuthUrlResponse>('GET', '/auth/google');
      return { data: response, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to get Google auth URL' 
      };
    }
  }

  async handleGoogleCallback(code: string): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.makeRequest<AuthResponse>('POST', '/auth/google/callback', {
        code
      });
      
      if (response.access_token) {
        this.token = response.access_token;
      }
      
      return { data: response, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Google authentication failed' 
      };
    }
  }

  // Current User
  async getCurrentUser(): Promise<ApiResponse<User>> {
    if (!this.token) {
      return { data: null, error: 'No token available' };
    }

    try {
      const user = await this.makeRequest<User>('GET', '/auth/me', null, true);
      return { data: user, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to get user info' 
      };
    }
  }

  // Token Management
  setToken(token: string) {
    this.token = token;
    // Also save to localStorage with 'auth-token' key for middleware
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth-token', token);
    }
    try {
      console.debug("[authAPI.setToken]", { hasToken: Boolean(token) });
    } catch {}
  }

  clearToken() {
    this.token = null;
    // Also remove from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      try {
        // Expire cookie
        document.cookie = 'auth-token=; Path=/; Max-Age=0; SameSite=Lax';
        document.cookie = 'auth-role=; Path=/; Max-Age=0; SameSite=Lax';
      } catch {}
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const authAPI = new AuthAPIClient();