import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examsAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const EditExamPage = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
    is_active: true
  });

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const response = await examsAPI.getById(examId);
      const exam = response.data.data;
      setFormData({
        title: exam.title || '',
        description: exam.description || '',
        subject: exam.subject || '',
        duration_minutes: exam.duration_minutes || 60,
        total_marks: exam.total_marks || 100,
        negative_marks: exam.negative_marks || 0.25,
        passing_percentage: exam.passing_percentage || 40,
        scheduled_start: exam.scheduled_start ? new Date(exam.scheduled_start).toISOString().slice(0, 16) : '',
        scheduled_end: exam.scheduled_end ? new Date(exam.scheduled_end).toISOString().slice(0, 16) : '',
        is_active: exam.is_active !== false
      });
    } catch (err) {
      setError('Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes),
        total_marks: parseInt(formData.total_marks),
        negative_marks: parseFloat(formData.negative_marks),
        passing_percentage: parseFloat(formData.passing_percentage)
      };

      await examsAPI.update(examId, payload);
      navigate(`/admin/exams/${examId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update exam');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Exam</h1>
        <p className="text-gray-600 mt-1">Update the exam details</p>
      </div>

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
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Scheduling</h3>

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
                  End Date & Time
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
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Updating...' : 'Update Exam'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/admin/exams/${examId}`)}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditExamPage;
