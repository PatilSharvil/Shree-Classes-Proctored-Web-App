import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { examsAPI } from '../../services/api';
import { sanitizeText } from '../../utils/sanitizer';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

const CreateExamPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    duration_minutes: 60,
    total_marks: 100,
    negative_marks: 0.25,
    passing_percentage: 40,
    scheduled_start: '',
    scheduled_end: '',
    is_active: true,
    tab_switch_threshold: 5,
    looking_away_threshold: 5
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-calculate end time when start or duration changes
    if (name === 'scheduled_start' || name === 'duration_minutes') {
      const startValue = name === 'scheduled_start' ? value : formData.scheduled_start;
      const durationValue = name === 'duration_minutes' ? value : formData.duration_minutes;
      
      if (startValue && durationValue) {
        const startDate = new Date(startValue);
        const duration = parseInt(durationValue) || 0;
        // Calculate end date in local time
        const endDate = new Date(startDate.getTime() + duration * 60000);
        
        // Format as YYYY-MM-DDTHH:mm (local time string for datetime-local)
        const year = endDate.getFullYear();
        const month = String(endDate.getMonth() + 1).padStart(2, '0');
        const day = String(endDate.getDate()).padStart(2, '0');
        const hour = String(endDate.getHours()).padStart(2, '0');
        const minute = String(endDate.getMinutes()).padStart(2, '0');
        const endDateString = `${year}-${month}-${day}T${hour}:${minute}`;
        
        setFormData(prev => ({
          ...prev,
          scheduled_end: endDateString
        }));
      }
    }
  };

  const setDurationPreset = (minutes) => {
    setFormData(prev => ({
      ...prev,
      duration_minutes: minutes
    }));
    
    // Recalculate end time if start date is set
    if (formData.scheduled_start) {
      const startDate = new Date(formData.scheduled_start);
      const endDate = new Date(startDate.getTime() + minutes * 60000);
      
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      const hour = String(endDate.getHours()).padStart(2, '0');
      const minute = String(endDate.getMinutes()).padStart(2, '0');
      const endDateString = `${year}-${month}-${day}T${hour}:${minute}`;
      
      setFormData(prev => ({
        ...prev,
        scheduled_end: endDateString
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation: Check if end time is after start time
    if (formData.scheduled_start && formData.scheduled_end) {
      const start = new Date(formData.scheduled_start);
      const end = new Date(formData.scheduled_end);
      if (end <= start) {
        setError('End time must be after start time');
        return;
      }
    }

    // Validation: Check if duration is sufficient for the exam
    if (formData.duration_minutes < 1) {
      setError('Duration must be at least 1 minute');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes),
        total_marks: parseInt(formData.total_marks),
        negative_marks: parseFloat(formData.negative_marks),
        passing_percentage: parseFloat(formData.passing_percentage),
        tab_switch_threshold: parseInt(formData.tab_switch_threshold),
        looking_away_threshold: parseInt(formData.looking_away_threshold),
        // Ensure dates are stored in UTC format
        scheduled_start: formData.scheduled_start ? new Date(formData.scheduled_start).toISOString() : null,
        scheduled_end: formData.scheduled_end ? new Date(formData.scheduled_end).toISOString() : null
      };

      await examsAPI.create(payload);
      navigate('/admin/exams');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main-content">
        <header className="dashboard-header flex items-center gap-4 mb-10">
          <Link to="/admin/exams" className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all active:scale-95">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="!m-0 text-2xl font-black text-gray-900">Create New Exam</h1>
            <p className="!m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Blueprint Initialization</p>
          </div>
        </header>

        <div className="">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Exam Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                placeholder="e.g., Mathematics Final Exam"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                placeholder="Brief description of the exam"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                placeholder="e.g., Mathematics, Physics, Chemistry"
              />
            </div>
          </div>

          {/* Exam Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Exam Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  id="duration_minutes"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setDurationPreset(30)}
                    className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded hover:bg-primary-100 border border-primary-200"
                  >
                    30 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationPreset(60)}
                    className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded hover:bg-primary-100 border border-primary-200"
                  >
                    1 hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationPreset(90)}
                    className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded hover:bg-primary-100 border border-primary-200"
                  >
                    90 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationPreset(120)}
                    className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded hover:bg-primary-100 border border-primary-200"
                  >
                    2 hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationPreset(180)}
                    className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded hover:bg-primary-100 border border-primary-200"
                  >
                    3 hours
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="total_marks" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Marks *
                </label>
                <input
                  type="number"
                  id="total_marks"
                  name="total_marks"
                  value={formData.total_marks}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="negative_marks" className="block text-sm font-medium text-gray-700 mb-1">
                  Negative Marks
                </label>
                <input
                  type="number"
                  id="negative_marks"
                  name="negative_marks"
                  value={formData.negative_marks}
                  onChange={handleChange}
                  step="0.25"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                />
              </div>

              <div>
                <label htmlFor="passing_percentage" className="block text-sm font-medium text-gray-700 mb-1">
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  id="passing_percentage"
                  name="passing_percentage"
                  value={formData.passing_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                />
              </div>
            </div>

            {/* Tab Switch Threshold */}
            <div>
              <label htmlFor="tab_switch_threshold" className="block text-sm font-medium text-gray-700 mb-1">
                Tab Switch Limit (Auto-Submit)
              </label>
              <input
                type="number"
                id="tab_switch_threshold"
                name="tab_switch_threshold"
                value={formData.tab_switch_threshold}
                onChange={handleChange}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
              />
              <p className="text-xs text-gray-500 mt-1">
                Student will be auto-submitted and flagged for cheating after this many tab switches. Default: 5
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tab_switch_threshold: 3 }))}
                  className="px-3 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200"
                >
                  Strict (3)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tab_switch_threshold: 5 }))}
                  className="px-3 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 border border-yellow-200"
                >
                  Normal (5)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tab_switch_threshold: 10 }))}
                  className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200"
                >
                  Lenient (10)
                </button>
              </div>
            </div>

            {/* Looking Away Threshold */}
            <div>
              <label htmlFor="looking_away_threshold" className="block text-sm font-medium text-gray-700 mb-1">
                Looking Away Limit (Auto-Submit)
              </label>
              <input
                type="number"
                id="looking_away_threshold"
                name="looking_away_threshold"
                value={formData.looking_away_threshold}
                onChange={handleChange}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
              />
              <p className="text-xs text-gray-500 mt-1">
                Student will be auto-submitted and flagged for cheating after looking away from screen this many times (any direction). Default: 5
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, looking_away_threshold: 3 }))}
                  className="px-3 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200"
                >
                  Strict (3)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, looking_away_threshold: 5 }))}
                  className="px-3 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 border border-yellow-200"
                >
                  Normal (5)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, looking_away_threshold: 10 }))}
                  className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200"
                >
                  Lenient (10)
                </button>
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Scheduling</h3>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
              <strong>💡 Tip:</strong> Set the start time and duration first. The end time will be calculated automatically.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduled_start" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="scheduled_start"
                  name="scheduled_start"
                  value={formData.scheduled_start}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                />
              </div>

              <div>
                <label htmlFor="scheduled_end" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time <span className="text-gray-500">(Auto-calculated)</span>
                </label>
                <input
                  type="datetime-local"
                  id="scheduled_end"
                  name="scheduled_end"
                  value={formData.scheduled_end}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 touch-target"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Make exam immediately available
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Exam'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/exams')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateExamPage;
