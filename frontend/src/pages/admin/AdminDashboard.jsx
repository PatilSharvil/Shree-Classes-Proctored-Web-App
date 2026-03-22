import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examsAPI, usersAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

// Import thumbnails
import primaryThumb from '../../assets/primary_exam.png';
import phdThumb from '../../assets/phd_exam.png';
import intermediateThumb from '../../assets/intermediate_exam.png';

const AdminDashboard = () => {
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState({ totalExams: 0, totalStudents: 0, activeExams: 0, totalMinutes: 0 });
  const [loading, setLoading] = useState(true);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

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
      const students = usersData.filter(u => u.role === 'STUDENT');

      setExams(examsData);
      setStats({
        totalExams: examsData.length,
        totalStudents: students.length,
        activeExams: examsData.filter(e => e.is_active).length,
        totalMinutes: examsData.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate duration analytics (histogram)
  const getDurationAnalytics = () => {
    const buckets = [0, 0, 0, 0, 0, 0]; // 0-30, 31-60, 61-90, 91-120, 121-150, 151+
    exams.forEach(exam => {
      const d = exam.duration_minutes || 0;
      if (d <= 30) buckets[0]++;
      else if (d <= 60) buckets[1]++;
      else if (d <= 90) buckets[2]++;
      else if (d <= 120) buckets[3]++;
      else if (d <= 150) buckets[4]++;
      else buckets[5]++;
    });
    const max = Math.max(...buckets, 1);
    return buckets.map(count => (count / max) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const durationData = getDurationAnalytics();

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main-content">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
        </header>

        {/* Analytics Section */}
        <section className="analytics-grid">
          {/* Test Minutes Card */}
          <div className="analytics-card">
            <div className="card-header">
              <div className="card-title title-purple">
                <i><i className="fas fa-bolt"></i></i>
                Test Minutes
              </div>
              <i className="fas fa-info-circle text-gray-400"></i>
            </div>
            <div className="minutes-content">
              <div className="minutes-value">
                {stats.totalMinutes} <span className="minutes-unit">minutes</span>
                <span className="hours-badge">{(stats.totalMinutes / 60).toFixed(1)} Hr</span>
              </div>
              <p className="text-gray-400 text-sm">Total Available Test Hours</p>
              
              <div className="sub-info">
                <div className="info-item">
                  <i className="fas fa-clock"></i>
                  <div>
                    <div className="font-semibold">Test Reminders</div>
                    <div className="text-gray-400 text-xs text-wrap">Automated system monitoring for upcoming sessions</div>
                    <div className="mt-1">
                      <span className="text-green-500 mr-2">System Active</span>
                      <span className="info-link">Settings</span>
                    </div>
                  </div>
                </div>
                
                <div className="pricing-banner">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-500">
                    <i className="fas fa-coins"></i>
                  </div>
                  <div>
                    <div className="font-semibold text-xs">Exams Configuration</div>
                    <div className="text-xs">Manage your <span className="info-link">Exam Credits <i className="fas fa-external-link-alt"></i></span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Duration Analytics Card */}
          <div className="analytics-card">
            <div className="card-header">
              <div className="card-title title-blue">
                <i><i className="fas fa-clock"></i></i>
                Test Duration Analytics
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                   <div className="text-2xl font-bold">{stats.totalStudents}</div>
                   <div className="text-xs text-gray-400">Registered Students</div>
                </div>
                <i className="fas fa-info-circle text-gray-400"></i>
              </div>
            </div>
            
            <div className="chart-content">
              <div className="chart-bars">
                {[5, 4, 3, 2, 1, 0].map((val) => (
                   <div key={val} className="absolute left-0 w-full border-t border-dashed border-gray-100" style={{ bottom: `${(val/5)*100}%` }}>
                     <span className="absolute -left-12 -top-2 text-xs text-gray-400">{val} tests</span>
                   </div>
                ))}
                {durationData.map((h, i) => (
                  <div key={i} className="bar-wrapper" style={{ height: '100%' }}>
                    <div className={`bar ${h > 0 ? 'highlight' : ''}`} style={{ height: `${h}%` }}></div>
                    <div className="bar-tooltip">
                      {i === 0 ? '0-30m' : i === 1 ? '31-60m' : i === 2 ? '61-90m' : i === 3 ? '91-120m' : i === 4 ? '121-150m' : '150m+'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2">
                       {i === 0 ? '30m' : i === 1 ? '60m' : i === 2 ? '90m' : i === 3 ? '120m' : i === 4 ? '150m' : '150+'}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="test-labels">
                {['General', 'PCM', 'PCB', 'Primary', 'PhD'].map((t) => (
                  <button key={t} className={`test-btn ${t === 'General' ? 'active' : ''}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Your Created Tests Section */}
        <section>
          <div className="created-tests-header">
            <h2>Your Created Tests <span className="text-gray-400 font-normal ml-2">| All Domains {exams.length}</span></h2>
            <Link to="/admin/exams" className="text-blue-500 font-semibold flex items-center gap-2">
              View All <i className="fas fa-chevron-right text-xs"></i>
            </Link>
          </div>

          <div className="test-grid">
            {exams.map((exam, idx) => {
              const thumbs = [primaryThumb, phdThumb, intermediateThumb];
              const labels = ['Primary', 'Ph.D', 'Intermediate'];
              const colors = ['#ff8a65', '#3b82f6', '#86efac'];
              
              return (
                <Link key={exam.id} to={`/admin/exams/${exam.id}`} className="exam-thumbnail-card">
                  <div className="card-media">
                    <img src={thumbs[idx % 3]} alt={exam.title} />
                    <div className="media-tag">
                      <span className="tag-dot" style={{ backgroundColor: colors[idx % 3] }}></span>
                      {labels[idx % 3]}
                    </div>
                    <div className="questions-count">
                      {exam.questions_count || 30}
                    </div>
                  </div>
                  <div className="exam-card-title">{exam.title}</div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;

