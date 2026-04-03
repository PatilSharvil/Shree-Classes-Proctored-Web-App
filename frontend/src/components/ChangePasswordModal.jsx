import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authAPI } from '../services/api';
import Card from './ui/Card';
import Button from './ui/Button';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(formData.newPassword)) {
      setError('New password must contain at least one uppercase letter.');
      return;
    }

    if (!/[0-9]/.test(formData.newPassword)) {
      setError('New password must contain at least one number.');
      return;
    }

    setLoading(true);

    try {
      console.log('[ChangePasswordModal] Attempting password change...');
      console.log('[ChangePasswordModal] Current cookies:', document.cookie);
      
      const response = await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      console.log('[ChangePasswordModal] Password change response:', response);

      // Update local state
      updateUser({ mustChangePassword: false });

      // Close modal and show success
      alert('Password changed successfully! You can now access the system.');
      onClose();

      // Redirect based on user role
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[ChangePasswordModal] Password change error:', err);
      console.error('[ChangePasswordModal] Error response:', err.response);
      console.error('[ChangePasswordModal] Error data:', err.response?.data);
      console.error('[ChangePasswordModal] Error status:', err.response?.status);
      
      // More specific error messages
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Current password is incorrect. Please check and try again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Session expired or CSRF token invalid. Please refresh the page and try again.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Invalid input. Please check your password meets all requirements.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-xl font-bold text-gray-900">Change Password Required</h2>
          <p className="text-gray-600 text-sm mt-2">
            For security reasons, you must change your password before continuing.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter current password"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter new password"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Min 8 characters, 1 uppercase, 1 number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Confirm new password"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Change Password & Continue'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ChangePasswordModal;
