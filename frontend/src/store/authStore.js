import { create } from 'zustand';
import { authAPI } from '../services/api';

// Check if user exists in localStorage on initialization
const storedUser = localStorage.getItem('user');
const initialUser = storedUser ? JSON.parse(storedUser) : null;

const useAuthStore = create((set, get) => ({
  user: initialUser,
  isAuthenticated: !!initialUser, // Initialize based on localStorage

  login: async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user, cookieSet } = response.data.data;

    // Store user data in localStorage (but NOT the token - it's in httpOnly cookie)
    localStorage.setItem('user', JSON.stringify(user));

    // Update state synchronously before returning
    set({ user, isAuthenticated: true });
    
    console.log('[AuthStore] Login successful, user authenticated:', user.email);
    return response.data;
  },

  logout: async () => {
    try {
      // Call logout endpoint to clear cookie
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local state even if API call fails
      localStorage.removeItem('user');
      localStorage.removeItem('csrf_token');
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

  // Check if user is authenticated (call this on app load)
  checkAuth: () => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      set({ user: parsedUser, isAuthenticated: true });
      console.log('[AuthStore] Auth check passed, user authenticated:', parsedUser.email);
      return true;
    }
    set({ isAuthenticated: false });
    console.log('[AuthStore] Auth check failed, no user found');
    return false;
  }
}));

export default useAuthStore;
