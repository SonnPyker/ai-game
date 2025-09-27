import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

export class AuthService {
  private supabase: SupabaseClient | null = null;
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null
  };
  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this.initializeAuth();
    } else {
      console.warn('Supabase configuration missing - Auth disabled');
      this.authState.isLoading = false;
      this.notifyListeners();
    }
  }

  private async initializeAuth(): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get initial session
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('Auth initialization error:', error);
        this.authState.error = error.message;
      } else if (session) {
        this.authState.isAuthenticated = true;
        this.authState.user = this.mapUser(session.user);
      }

      this.authState.isLoading = false;
      this.notifyListeners();

      // Listen for auth changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session) {
          this.authState.isAuthenticated = true;
          this.authState.user = this.mapUser(session.user);
          this.authState.error = null;
        } else {
          this.authState.isAuthenticated = false;
          this.authState.user = null;
        }
        
        this.authState.isLoading = false;
        this.notifyListeners();
      });

    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.authState.error = error instanceof Error ? error.message : 'Unknown error';
      this.authState.isLoading = false;
      this.notifyListeners();
    }
  }

  private mapUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar: user.user_metadata?.avatar_url
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // Sign up with email and password
  async signUp(email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase không khả dụng' };
    }

    try {
      this.authState.isLoading = true;
      this.notifyListeners();

      const { error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (error) {
        this.authState.error = error.message;
        this.authState.isLoading = false;
        this.notifyListeners();
        return { success: false, error: error.message };
      }

      this.authState.isLoading = false;
      this.notifyListeners();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.authState.error = errorMessage;
      this.authState.isLoading = false;
      this.notifyListeners();
      return { success: false, error: errorMessage };
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase không khả dụng' };
    }

    try {
      this.authState.isLoading = true;
      this.notifyListeners();

      const { error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        this.authState.error = error.message;
        this.authState.isLoading = false;
        this.notifyListeners();
        return { success: false, error: error.message };
      }

      // Cập nhật state ngay lập tức - sẽ được override bởi onAuthStateChange
      this.authState.isAuthenticated = true;
      this.authState.error = null;
      this.authState.isLoading = false;
      this.notifyListeners();
      
      // Auto refresh trang để cập nhật trạng thái
      setTimeout(() => {
        window.location.reload();
      }, 100); // Delay 100ms để đảm bảo state đã được cập nhật
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.authState.error = errorMessage;
      this.authState.isLoading = false;
      this.notifyListeners();
      return { success: false, error: errorMessage };
    }
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase không khả dụng' };
    }

    try {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase không khả dụng' };
    }

    try {
      this.authState.isLoading = true;
      this.notifyListeners();

      const { error } = await this.supabase.auth.signOut();

      if (error) {
        this.authState.error = error.message;
        this.authState.isLoading = false;
        this.notifyListeners();
        return { success: false, error: error.message };
      }

      // Cập nhật state ngay lập tức
      this.authState.isAuthenticated = false;
      this.authState.user = null;
      this.authState.error = null;
      this.authState.isLoading = false;
      this.notifyListeners();
      
      // Auto refresh trang để cập nhật trạng thái
      setTimeout(() => {
        window.location.reload();
      }, 100); // Delay 100ms để đảm bảo state đã được cập nhật
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.authState.error = errorMessage;
      this.authState.isLoading = false;
      this.notifyListeners();
      return { success: false, error: errorMessage };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase không khả dụng' };
    }

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    return this.authState.user;
  }

  // Check if auth is available
  isAvailable(): boolean {
    return this.supabase !== null;
  }
}

// Singleton instance
export const authService = new AuthService();
