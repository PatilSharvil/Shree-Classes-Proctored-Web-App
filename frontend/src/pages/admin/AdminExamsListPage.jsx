import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { examsAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const AdminExamsListPage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await examsAPI.getAll();
      setExams(response.data.data || []);
    } catch (error) {
      console.error('Failed to load exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this exam? This cannot be undone.')) return;
    
    try {
      await examsAPI.delete(id);
      loadExams();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete exam');
    }
  };

  const filteredExams = exams.filter(exam => {
    if (filter === 'active') return exam.is_active;
    if (filter === 'inactive') return !exam.is_active;
    return true;
  });

  const getScheduleStatus = (exam) => {
    const now = new Date();
    const start = exam.scheduled_start ? new Date(exam.scheduled_start) : null;
    const end = exam.scheduled_end ? new Date(exam.scheduled_end) : null;

    if (!start && !end) return { label: 'Anytime', color: 'bg-gray-100 text-gray-700' };
    if (start && end && now < start) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    if (start && end && now >= start && now <= end) return { label: 'Ongoing', color: 'bg-green-100 text-green-700' };
    if (start && end && now > end) return { label: 'Ended', color: 'bg-red-100 text-red-700' };
    return { label: 'Anytime', color: 'bg-gray-100 text-gray-700' };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-gray-600 mt-1">Manage all exams</p>
        </div>
        <Link to="/admin/exams/new">
          <Button>+ Create Exam</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All ({exams.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Active ({exams.filter(e => e.is_active).length})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            filter === 'inactive'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Inactive ({exams.filter(e => !e.is_active).length})
        </button>
      </div>

      {/* Exams List */}
      {filteredExams.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              {filter === 'all' ? 'No exams created yet' : `No ${filter} exams`}
            </p>
            {filter === 'all' && (
              <Link to="/admin/exams/new">
                <Button>Create Your First Exam</Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Duration</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Questions</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Schedule</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">{exam.title}</div>
                    {exam.description && (
                      <div className="text-gray-500 text-xs line-clamp-1 mt-1">
                        {exam.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {exam.subject || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {exam.duration_minutes} min
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {exam.question_count || 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getScheduleStatus(exam).color}`}>
                      {getScheduleStatus(exam).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      exam.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {exam.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <Link to={`/admin/exams/${exam.id}`}>
                        <Button variant="outline" size="sm">Manage</Button>
                      </Link>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="text-red-600 hover:text-red-800 font-medium px-3 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminExamsListPage;
