import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { examsAPI, usersAPI } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const AdminDashboard = () => {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ totalExams: 0, totalStudents: 0, activeExams: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examsRes, usersRes] = await Promise.all([
        examsAPI.getAll(),
        usersAPI.getAll()
      ]);
      
      const examsData = examsRes.data.data || [];
      const usersData = usersRes.data.data || [];
      
      setExams(examsData);
      setStudents(usersData.filter(u => u.role === 'STUDENT'));
      setStats({
        totalExams: examsData.length,
        totalStudents: usersData.filter(u => u.role === 'STUDENT').length,
        activeExams: examsData.filter(e => e.is_active).length
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage exams and students</p>
        </div>
        <Link to="/admin/exams/new">
          <Button>+ Create Exam</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <div className="text-3xl font-bold text-primary-600">{stats.totalExams}</div>
          <div className="text-gray-600">Total Exams</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-green-600">{stats.activeExams}</div>
          <div className="text-gray-600">Active Exams</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.totalStudents}</div>
          <div className="text-gray-600">Students</div>
        </Card>
      </div>

      {/* Recent Exams */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Exams</h2>
          <Link to="/admin/exams">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
        
        {exams.length === 0 ? (
          <Card>
            <p className="text-gray-600 text-center py-8">No exams created yet</p>
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {exams.slice(0, 5).map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{exam.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{exam.subject || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{exam.duration_minutes} min</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{exam.question_count || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        exam.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {exam.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link to={`/admin/exams/${exam.id}`}>
                        <Button variant="outline" size="sm">Manage</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/exams/new">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center py-4">
                <div className="text-2xl mb-2">📝</div>
                <div className="font-medium">Create Exam</div>
              </div>
            </Card>
          </Link>
          <Link to="/admin/exams">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center py-4">
                <div className="text-2xl mb-2">📚</div>
                <div className="font-medium">All Exams</div>
              </div>
            </Card>
          </Link>
          <Link to="/admin/students">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center py-4">
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium">Manage Students</div>
              </div>
            </Card>
          </Link>
          <Link to="/admin/analytics">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center py-4">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium">Analytics</div>
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
