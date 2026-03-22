import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { examsAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

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

    if (!start && !end) return { label: 'Anytime', color: 'bg-gray-100 text-gray-500' };
    if (start && end && now < start) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-600' };
    if (start && end && now >= start && now <= end) return { label: 'Ongoing', color: 'bg-green-100 text-green-600' };
    if (start && end && now > end) return { label: 'Ended', color: 'bg-red-100 text-red-600' };
    return { label: 'Anytime', color: 'bg-gray-100 text-gray-500' };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main-content">
        <header className="dashboard-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all active:scale-95">
              <i className="fas fa-arrow-left"></i>
            </Link>
            <div>
              <h1 className="!m-0 text-2xl font-black text-gray-900">Assessments</h1>
              <p className="!m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Examination Hub</p>
            </div>
          </div>
          <Link to="/admin/exams/new" className="active:scale-95 transition-transform">
             <button className="px-6 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <i className="fas fa-plus-circle"></i> Create New Exam
             </button>
          </Link>
        </header>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap gap-3 mb-8 bg-gray-50/50 p-2 rounded-[24px] border border-gray-100/50 w-fit">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              filter === 'all'
                ? 'bg-white text-blue-600 shadow-md shadow-blue-100 ring-1 ring-blue-50'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Tracks <span className="ml-2 opacity-50">({exams.length})</span>
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              filter === 'active'
                ? 'bg-white text-green-600 shadow-md shadow-green-100 ring-1 ring-green-50'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            Live Exams <span className="ml-2 opacity-50">({exams.filter(e => e.is_active).length})</span>
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              filter === 'inactive'
                ? 'bg-white text-slate-600 shadow-md shadow-slate-100 ring-1 ring-slate-50'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            Drafts / Hidden <span className="ml-2 opacity-50">({exams.filter(e => !e.is_active).length})</span>
          </button>
        </div>

        {/* Modern Exams Table */}
        {filteredExams.length === 0 ? (
          <Card className="!rounded-[40px] border-none shadow-xl shadow-slate-200/50 text-center py-24 group">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-4xl text-gray-200 mb-6 mx-auto group-hover:scale-110 transition-transform duration-500">
               <i className="fas fa-layer-group"></i>
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">
              {filter === 'all' ? 'The assessment laboratory is empty' : `No ${filter} exams discovered`}
            </p>
            {filter === 'all' && (
              <Link to="/admin/exams/new" className="mt-6 inline-block text-blue-600 font-black text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-8">
                Initialize first assessment
              </Link>
            )}
          </Card>
        ) : (
          <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-white overflow-hidden w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Exam Blueprint</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Domain</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Metrics</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Timeline</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-blue-50/20 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50 flex items-center justify-center text-blue-600 shadow-sm transition-transform group-hover:rotate-6">
                            <i className="fas fa-file-signature text-lg"></i>
                         </div>
                         <div>
                            <div className="font-extrabold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{exam.title}</div>
                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter mt-0.5">
                               ID: #{exam.id.toString().slice(-4)} • Updated {new Date().toLocaleDateString()}
                            </div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">
                          {exam.subject || 'General'}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1">
                          <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                             <i className="far fa-clock text-blue-400 w-3"></i> {exam.duration_minutes}m Duration
                          </div>
                          <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                             <i className="far fa-list-alt text-blue-400 w-3"></i> {exam.question_count || 0} Questions
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getScheduleStatus(exam).color} border border-current opacity-80`}>
                          {getScheduleStatus(exam).label}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${exam.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                           <span className={`text-[10px] font-black uppercase tracking-widest ${exam.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                             {exam.is_active ? 'Public' : 'Hidden'}
                           </span>
                        </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 transition-all">
                        <Link to={`/admin/exams/${exam.id}`}>
                          <button className="w-10 h-10 bg-white border border-gray-100 rounded-xl text-blue-500 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all flex items-center justify-center shadow-sm">
                             <i className="fas fa-cog"></i>
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="w-10 h-10 bg-white border border-gray-100 rounded-xl text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all flex items-center justify-center shadow-sm"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminExamsListPage;
