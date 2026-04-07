import { create } from 'zustand';
import { authAPI } from '../services/api';

// Check if user/token exists in localStorage on initialization
const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('token');
const initialUser = storedUser ? JSON.parse(storedUser) : null;

const useAuthStore = create((set, get) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,

  login: async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user, token, cookieSet } = response.data.data;

    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    // CRITICAL: Store token in localStorage as fallback when cookies are stripped by proxy
    if (token) {
      localStorage.setItem('token', token);
      console.log('[AuthStore] Token stored in localStorage');
    }

    // Update state synchronously
    set({ user, isAuthenticated: true });
    
    console.log('[AuthStore] Login successful, user authenticated:', user.email);
    return response.data;
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('csrf_token');
      localStorage.removeItem('token'); // Clear token on logout
      set({ user: null, isAuthenticated: false });
      console.log('[AuthStore] User logged out');
    }
  },

  updateUser: (userData) => {
    const updatedUser = { ...get().user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
    console.log('[AuthStore] User updated:', updatedUser);
  },

  checkAuth: async () => {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!user || !token) {
      set({ user: null, isAuthenticated: false });
      console.log('[AuthStore] Auth check failed, no user or token found');
      return false;
    }

    // Validate token with backend before setting authenticated state
    try {
      const response = await authAPI.getMe();
      const parsedUser = response.data.data;
      // Update localStorage with fresh user data from backend
      localStorage.setItem('user', JSON.stringify(parsedUser));
      set({ user: parsedUser, isAuthenticated: true });
      console.log('[AuthStore] Auth check passed, token validated:', parsedUser.email);
      return true;
    } catch (error) {
      // Only clear auth state on 401 (token invalid/expired), not on network errors
      if (error.response?.status === 401) {
        console.error('[AuthStore] Token validation failed (401), clearing auth state');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('csrf_token');
        set({ user: null, isAuthenticated: false });
        return false;
      }
      // Network error or server unreachable — trust localStorage as fallback
      console.warn('[AuthStore] Backend unreachable, trusting localStorage:', error.message);
      const parsedUser = JSON.parse(user);
      set({ user: parsedUser, isAuthenticated: true });
      return true;
    }
  }
}));

export default useAuthStore;
