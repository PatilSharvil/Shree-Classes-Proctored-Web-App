import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { examsAPI, proctoringAPI } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

const ProctoringDashboardPage = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveSessions, setLiveSessions] = useState([]);
  const [activitySummary, setActivitySummary] = useState([]);
  const [violationStats, setViolationStats] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionTimeline, setSessionTimeline] = useState([]);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      const [examRes, liveRes, summaryRes, statsRes] = await Promise.all([
        examsAPI.getById(examId),
        proctoringAPI.getLiveActiveSessions(examId),
        proctoringAPI.getExamActivitySummary(examId),
        proctoringAPI.getExamStats(examId)
      ]);
      setExam(examRes.data.data);
      setLiveSessions(liveRes.data.data || []);
      setActivitySummary(summaryRes.data.data || []);
      setViolationStats(statsRes.data.data || []);
    } catch (err) {
      setError('Failed to load proctoring data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load session timeline
  const loadSessionTimeline = async (sessionId) => {
    try {
      const res = await proctoringAPI.getSessionActivityTimeline(sessionId);
      setSessionTimeline(res.data.data || []);
      setSelectedSession(sessionId);
      setShowTimelineModal(true);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [examId, autoRefresh]);

  if (loading && !exam) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!exam && !loading) {
    return (
      <Card>
        <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-700 mb-4">Exam not found</p>
        <Link to="/admin/exams">
          <Button>Back to Exams</Button>
        </Link>
      </Card>
    );
  }

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'low': return 'bg-blue-100 text-blue-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'in_progress': return 'bg-green-100 text-green-700';
      case 'submitted': return 'bg-blue-100 text-blue-700';
      case 'auto_submitted': return 'bg-red-100 text-red-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // Calculate stats
  const totalActiveStudents = liveSessions.length;
  const studentsWithViolations = liveSessions.filter(s => s.recent_violations > 0).length;
  const avgViolations = liveSessions.length > 0 
    ? (liveSessions.reduce((sum, s) => sum + (s.recent_violations || 0), 0) / liveSessions.length).toFixed(1)
    : 0;

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main-content">
        {/* Header */}
        <header className="dashboard-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to={`/admin/exams/${examId}/manage`}>
                <button className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all">
                  ←
                </button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Proctoring Dashboard</h1>
            </div>
            <p className="text-gray-600">{exam?.title}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              Auto-refresh (10s)
            </label>
            <Button onClick={loadData} variant="secondary" size="sm">
              Refresh
            </Button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="text-center">
            <div className="text-3xl font-bold text-blue-600">{totalActiveStudents}</div>
            <div className="text-sm text-gray-600 mt-1">Active Students</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-red-600">{studentsWithViolations}</div>
            <div className="text-sm text-gray-600 mt-1">With Violations</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-orange-600">{avgViolations}</div>
            <div className="text-sm text-gray-600 mt-1">Avg Violations</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-green-600">{exam?.is_active ? 'Active' : 'Inactive'}</div>
            <div className="text-sm text-gray-600 mt-1">Exam Status</div>
          </Card>
        </div>

        {/* Live Sessions */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">🔴 Live Monitoring</h2>
            <span className="text-sm text-gray-500">{liveSessions.length} active sessions</span>
          </div>

          {liveSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active sessions at the moment
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Started</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Activity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Violations (5m)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {liveSessions.map((session) => (
                    <tr key={session.session_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{session.name || session.email}</div>
                        <div className="text-sm text-gray-500">{session.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(session.status)}`}>
                          {session.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatTime(session.started_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600">{formatTime(session.last_activity)}</div>
                        <div className="text-xs text-gray-400">{formatRelativeTime(session.last_activity)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {session.recent_violations > 0 ? (
                          <span className="text-red-600 font-bold">{session.recent_violations}</span>
                        ) : (
                          <span className="text-green-600">✓</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${
                          session.weighted_score >= 5 ? 'text-red-600' :
                          session.weighted_score >= 3 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {session.weighted_score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadSessionTimeline(session.session_id)}
                        >
                          View Activity
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* All Sessions Summary */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">📊 All Sessions Summary</h2>
            <span className="text-sm text-gray-500">{activitySummary.length} total sessions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total Events</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Violations</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Weighted Score</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Activity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activitySummary.map((session) => (
                  <tr key={session.session_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{session.name || session.email}</div>
                      <div className="text-sm text-gray-500">{session.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {session.total_events || 0}
                    </td>
                    <td className="px-4 py-3">
                      {session.violation_events > 0 ? (
                        <span className="text-red-600 font-bold">{session.violation_events}</span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        session.weighted_score >= 5 ? 'text-red-600' :
                        session.weighted_score >= 3 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {session.weighted_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatRelativeTime(session.last_activity)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadSessionTimeline(session.session_id)}
                      >
                        View Timeline
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Timeline Modal */}
        {showTimelineModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Activity Timeline</h3>
                <button
                  onClick={() => setShowTimelineModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {sessionTimeline.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activity logs found
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionTimeline.map((event, idx) => {
                    const eventData = event.event_data ? JSON.parse(event.event_data) : {};
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border-l-4 ${
                          event.is_violation ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {event.is_violation && '⚠️ '}
                              {event.event_type.replace(/_/g, ' ')}
                            </div>
                            {eventData.description && (
                              <div className="text-sm text-gray-600 mt-1">
                                {eventData.description}
                              </div>
                            )}
                            {eventData.severity && (
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(eventData.severity)}`}>
                                {eventData.severity}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatTime(event.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProctoringDashboardPage;
