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
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <p className="text-primary-100 mt-2 text-lg">Manage exams and students for Shree Science Academy</p>
          </div>
          <Link to="/admin/exams/new">
            <Button className="bg-white !text-primary-600 hover:bg-primary-50 px-6 py-3 font-bold !rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95">
              <i className="fas fa-plus mr-2"></i> Create New Exam
            </Button>
          </Link>
        </div>
        {/* Abstract shape decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-8 border-none bg-blue-50/50">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 text-2xl shadow-sm">
            <i className="fas fa-file-alt"></i>
          </div>
          <div className="text-4xl font-black text-blue-600 tracking-tight">{stats.totalExams}</div>
          <div className="text-blue-800 font-semibold mt-1">Total Exams</div>
        </Card>
        <Card className="flex flex-col items-center justify-center p-8 border-none bg-green-50/50">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-4 text-2xl shadow-sm">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="text-4xl font-black text-green-600 tracking-tight">{stats.activeExams}</div>
          <div className="text-green-800 font-semibold mt-1">Active Exams</div>
        </Card>
        <Card className="flex flex-col items-center justify-center p-8 border-none bg-purple-50/50">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-4 text-2xl shadow-sm">
            <i className="fas fa-user-graduate"></i>
          </div>
          <div className="text-4xl font-black text-purple-600 tracking-tight">{stats.totalStudents}</div>
          <div className="text-purple-800 font-semibold mt-1">Enrolled Students</div>
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
          <Card className="border-dashed border-2">
            <p className="text-gray-500 text-center py-12 italic">No exams created yet. Start by creating a new MHT CET test.</p>
          </Card>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Exam Title</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Questions</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {exams.slice(0, 5).map((exam) => (
                    <tr key={exam.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 group-hover:text-primary-600">{exam.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium">{exam.subject || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <i className="far fa-clock mr-2 text-gray-400"></i> {exam.duration_minutes} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <i className="fas fa-list-ol mr-2 text-gray-400"></i> {exam.question_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          exam.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {exam.is_active ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <Link to={`/admin/exams/${exam.id}`}>
                          <Button variant="outline" size="sm" className="!rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-all">
                            Manage <i className="fas fa-arrow-right ml-1 text-xs"></i>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-primary-600 rounded-full"></span>
          Quick Navigation
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/exams/new" className="group">
            <Card className="hover:border-primary-500 transition-all transform group-hover:-translate-y-1">
              <div className="text-center py-6">
                <div className="text-4xl mb-4 bg-primary-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-primary-600">
                  <i className="fas fa-file-signature"></i>
                </div>
                <div className="font-bold text-gray-800">Create Exam</div>
                <p className="text-xs text-gray-500 mt-2 px-4">Draft new MHT CET test papers</p>
              </div>
            </Card>
          </Link>
          <Link to="/admin/exams" className="group">
            <Card className="hover:border-purple-500 transition-all transform group-hover:-translate-y-1">
              <div className="text-center py-6">
                <div className="text-4xl mb-4 bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-purple-600">
                  <i className="fas fa-book-open"></i>
                </div>
                <div className="font-bold text-gray-800">Exam Repository</div>
                <p className="text-xs text-gray-500 mt-2 px-4">Browse and search all exams</p>
              </div>
            </Card>
          </Link>
          <Link to="/admin/students" className="group">
            <Card className="hover:border-indigo-500 transition-all transform group-hover:-translate-y-1">
              <div className="text-center py-6">
                <div className="text-4xl mb-4 bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
                  <i className="fas fa-users-cog"></i>
                </div>
                <div className="font-bold text-gray-800">Students</div>
                <p className="text-xs text-gray-500 mt-2 px-4">Manage enrollment and roles</p>
              </div>
            </Card>
          </Link>
          <Link to="/admin/analytics" className="group">
            <Card className="hover:border-orange-500 transition-all transform group-hover:-translate-y-1">
              <div className="text-center py-6">
                <div className="text-4xl mb-4 bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-orange-600">
                  <i className="fas fa-chart-pie"></i>
                </div>
                <div className="font-bold text-gray-800">Analytics</div>
                <p className="text-xs text-gray-500 mt-2 px-4">Check student performance</p>
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
