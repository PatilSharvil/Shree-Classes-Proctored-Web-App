import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  isAuthenticated: false, // Will be determined by checking if user data exists

  login: async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user, cookieSet } = response.data.data;

    // Store user data in localStorage (but NOT the token - it's in httpOnly cookie)
    localStorage.setItem('user', JSON.stringify(user));

    set({ user, isAuthenticated: true });
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
    }
  },

  updateUser: (userData) => {
    const updatedUser = { ...useAuthStore.getState().user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  // Check if user is authenticated (call this on app load)
  checkAuth: () => {
    const user = localStorage.getItem('user');
    if (user) {
      set({ user: JSON.parse(user), isAuthenticated: true });
      return true;
    }
    set({ isAuthenticated: false });
    return false;
  }
}));

export default useAuthStore;
