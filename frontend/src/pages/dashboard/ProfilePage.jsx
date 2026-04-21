import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { attemptsAPI, authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatTime } from '../../hooks/useExamTimer';

const ProfilePage = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await attemptsAPI.getHistory();
      setAttemptHistory(res.data.data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate stats
  const totalAttempts = attemptHistory.length;
  const avgPercentage = totalAttempts > 0 
    ? (attemptHistory.reduce((sum, h) => sum + Math.min(100, parseFloat(h.percentage) || 0), 0) / totalAttempts).toFixed(1) 
    : '0';
  const bestScore = totalAttempts > 0 
    ? Math.min(100, Math.max(...attemptHistory.map(h => parseFloat(h.percentage) || 0))).toFixed(1) 
    : '0';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-3xl">
              <i className="fas fa-user"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.name || 'Student'}</h1>
              <p className="text-white/70 mt-1">{user?.email}</p>
              <p className="text-white/70 text-sm mt-1">Student Account</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-xl font-semibold text-sm transition-all flex items-center gap-2"
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-50 text-center">
          <div className="text-3xl font-bold text-blue-600">{totalAttempts}</div>
          <div className="text-sm text-gray-500 mt-1">Total Attempts</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-50 text-center">
          <div className="text-3xl font-bold text-green-600">{avgPercentage}%</div>
          <div className="text-sm text-gray-500 mt-1">Average Score</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-50 text-center">
          <div className="text-3xl font-bold text-indigo-600">{bestScore}%</div>
          <div className="text-sm text-gray-500 mt-1">Best Score</div>
        </div>
      </div>

      {/* Full Attempt History */}
      <div className="bg-white rounded-3xl p-8 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
          Complete Attempt History
        </h2>

        {attemptHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-clipboard-list text-5xl mb-4 opacity-30"></i>
            <p>No attempts yet. Start taking exams to see your history!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {attemptHistory.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      attempt.percentage >= 70
                        ? 'bg-green-100 text-green-600'
                        : attempt.percentage >= 40
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{attempt.exam_title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{new Date(attempt.submitted_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{formatTime(attempt.duration_taken)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold ${
                        Math.min(100, attempt.percentage) >= 70
                          ? 'text-green-600'
                          : Math.min(100, attempt.percentage) >= 40
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {Math.min(100, parseFloat(attempt.percentage) || 0).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-400">Score</div>
                  </div>
                  <Link
                    to={`/results/${attempt.session_id || attempt.id}`}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back to Dashboard */}
      <div className="flex justify-center">
        <Link
          to="/dashboard"
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default ProfilePage;
