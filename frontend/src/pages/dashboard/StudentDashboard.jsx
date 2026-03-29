import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { examsAPI, attemptsAPI } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatTime } from '../../hooks/useExamTimer';
import useAuthStore from '../../store/authStore';

const StudentDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const [activeExams, setActiveExams] = useState([]);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');

    let hasError = false;
    let errMsg = '';

    // Load exams independently — don't block history if this fails
    try {
      const examsRes = await examsAPI.getAll({ is_active: 'true' });
      const examsData = examsRes.data?.data || [];
      setActiveExams(examsData.filter(exam => exam.question_count > 0));
    } catch (err) {
      console.error('Error loading exams:', err);
      hasError = true;
      errMsg += 'Exams Error: ' + (err.message || String(err)) + '. ';
    }

    // Load attempt history independently
    try {
      const historyRes = await attemptsAPI.getHistory();
      setAttemptHistory(historyRes.data?.data || []);
    } catch (err) {
      console.error('Error loading attempt history:', err);
      hasError = true;
      errMsg += 'History Error: ' + (err.message || String(err)) + '. ';
    }

    if (hasError) {
      setError(`Some data failed to load: ${errMsg}`);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Helper for subject stats
  const calculateSubjectStat = (history, subject) => {
    const filtered = history.filter(h =>
      h.exam_title?.toLowerCase().includes(subject.toLowerCase()) ||
      h.subject?.toLowerCase() === subject.toLowerCase()
    );
    if (filtered.length === 0) return 0;
    return Math.round(filtered.reduce((sum, h) => sum + (h.percentage || 0), 0) / filtered.length);
  };

  // Calculate active streak
  const calculateStreak = (history) => {
    if (!history || history.length === 0) return 0;
    const attemptDates = history.map(h => new Date(h.submitted_at).toDateString());
    const uniqueDates = [...new Set(attemptDates)].map(d => new Date(d)).sort((a, b) => b - a);

    let streak = 0;
    const now = new Date();
    now.setHours(0,0,0,0);

    const lastAttemptDate = new Date(uniqueDates[0]);
    lastAttemptDate.setHours(0,0,0,0);

    const diffToToday = (now - lastAttemptDate) / (1000 * 60 * 60 * 24);
    if (diffToToday > 1) return 0;

    streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const d1 = uniqueDates[i];
      const d2 = uniqueDates[i+1];
      const diff = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  };

  // Calculate Performance Level
  const getPerformanceLevel = (history) => {
    if (!history || history.length === 0) return 'Get Started';
    const avg = history.reduce((sum, h) => sum + (h.percentage || 0), 0) / history.length;
    if (avg >= 90) return 'Excellent';
    if (avg >= 75) return 'Good';
    if (avg >= 50) return 'Average';
    return 'Keep Practicing';
  };

  // Find subject needing improvement
  const getSubjectToImprove = (history) => {
    const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    const stats = subjects.map(s => ({ name: s, score: calculateSubjectStat(history, s) }));
    const sorted = stats.filter(s => s.score > 0).sort((a, b) => a.score - b.score);
    return sorted.length > 0 ? sorted[0].name : 'General Prep';
  };

  const streak = calculateStreak(attemptHistory);
  const performanceLevel = getPerformanceLevel(attemptHistory);
  const improveSubject = getSubjectToImprove(attemptHistory);
  const avgPercentage = attemptHistory.length > 0 ? (attemptHistory.reduce((sum, h) => sum + (h.percentage || 0), 0) / attemptHistory.length).toFixed(1) : '0';

  return (
    <div className="space-y-10 pb-20 animate-fade-in">
      {/* HERO SECTION */}
      <div
        className="relative overflow-hidden rounded-3xl p-1 shadow-xl shadow-blue-200/40 group"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #0ea5e9 100%)'
        }}
      >
        <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/20 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold mb-4 tracking-wide text-white border border-white/10">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Student Portal Active
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight">
              Welcome Back,<br/>
              <span className="font-semibold">{user?.name || 'Student'}</span>
            </h1>
            <p className="text-white/80 text-base font-medium max-w-lg leading-relaxed mb-6">
              MHT-CET Exam Prep — Study smart and achieve your best scores with Shree Science Academy.
            </p>
            <div className="flex flex-wrap gap-3">
               <div className="px-5 py-2.5 bg-white/95 text-blue-700 rounded-xl font-bold text-xs tracking-wide shadow-lg hover:bg-white transition-all cursor-default">
                  {performanceLevel}
               </div>
            </div>
          </div>

          <div className="hidden lg:block w-64 h-64 relative">
             <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/30 h-full w-full flex items-center justify-center p-6 overflow-hidden">
                <i className="fas fa-user-graduate text-white text-7xl opacity-40"></i>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                   <div
                      className="h-full bg-white rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (attemptHistory.length / 10) * 100)}%` }}
                   ></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl font-medium text-sm flex items-center gap-3 shadow-lg">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* STATS GRID — Fix #6: responsive grid, smaller padding on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
        {[
          { icon: 'fa-edit', gradient: 'from-blue-500 to-cyan-500', value: attemptHistory.length, label: 'Tests Taken' },
          { icon: 'fa-chart-pie', gradient: 'from-green-500 to-emerald-500', value: `${avgPercentage}%`, label: 'Avg Score' },
          { icon: 'fa-rocket', gradient: 'from-indigo-500 to-purple-500', value: attemptHistory.reduce((sum, h) => sum + (h.score || 0), 0), label: 'Total Points' },
          { icon: 'fa-stopwatch', gradient: 'from-orange-500 to-amber-500', value: Math.round(attemptHistory.reduce((sum, h) => sum + (h.duration_taken || 0), 0) / 60), label: 'Study Minutes' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-3xl p-4 sm:p-6 shadow-lg border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className={`w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center mb-3 text-base sm:text-xl text-white shadow-lg`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* EXAMS & HISTORY SECTION */}
        <div className="lg:col-span-2 space-y-10">

          {/* AVAILABLE EXAMS */}
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
               <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                 <span className="w-2.5 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></span>
                 Available Exams
               </h2>
               <div className="flex items-center gap-2">
                  <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-100">{activeExams.length} Available</span>
               </div>
            </div>

            {activeExams.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 flex flex-col items-center text-center">
                 <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-ghost text-gray-200 text-4xl"></i>
                 </div>
                 <h3 className="text-lg font-semibold text-gray-400 mb-2">No Exams Available</h3>
                 <p className="text-gray-400 text-sm max-w-xs">New exams will appear here when your teachers create them</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {activeExams.map((exam, idx) => (
                  <div key={exam.id} className="relative group overflow-hidden rounded-3xl shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 group-hover:from-blue-600 group-hover:to-indigo-700 transition-all duration-500"></div>

                    <div className="relative z-10 p-8 space-y-5">
                      <div className="flex justify-between items-start">
                        <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-xl group-hover:bg-white group-hover:text-blue-600 transition-all shadow-sm">
                          <i className="fas fa-atom"></i>
                        </div>
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 group-hover:bg-white/20 group-hover:text-white px-3 py-1.5 rounded-xl transition-colors">
                          {exam.subject || 'GENERAL'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-white transition-colors line-clamp-1">{exam.title}</h3>
                        <p className="text-sm text-gray-500 group-hover:text-white/70 mt-1.5 line-clamp-2 leading-relaxed transition-colors">
                          {exam.description || 'Practice exam for MHT-CET preparation'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-5 border-t border-gray-100 group-hover:border-white/10 transition-colors">
                        <div className="flex flex-col gap-1">
                           <span className="text-xs text-gray-400 group-hover:text-white/60 font-medium">Time Limit</span>
                           <span className="text-sm font-semibold text-gray-800 group-hover:text-white transition-colors">{exam.duration_minutes} Minutes</span>
                        </div>
                        <div className="flex flex-col gap-1 border-l pl-3 border-gray-100 group-hover:border-white/10 transition-colors">
                           <span className="text-xs text-gray-400 group-hover:text-white/60 font-medium">Questions</span>
                           <span className="text-sm font-semibold text-gray-800 group-hover:text-white transition-colors">{exam.question_count} MCQs</span>
                        </div>
                      </div>

                      <Link to={`/exam/${exam.id}`} className="block transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <button className="w-full py-4 bg-white text-blue-700 font-bold text-xs rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                           Start Exam <i className="fas fa-chevron-right text-xs"></i>
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PERFORMANCE HISTORY — wrapped in overflow for mobile */}
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                   <span className="w-2.5 h-8 bg-gradient-to-b from-indigo-600 to-sky-600 rounded-full"></span>
                   Recent Performance
                </h2>
                <Link to="/profile" className="text-xs text-indigo-500 font-semibold hover:text-indigo-700 transition-colors">View Full History</Link>
            </div>

            {attemptHistory.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-gray-400 text-center border-2 border-dashed border-gray-200 flex flex-col items-center">
                 <i className="fas fa-chart-line text-4xl mb-4 opacity-20"></i>
                 <p className="font-medium text-sm">Take your first exam to see your progress</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-x-auto">
                {attemptHistory.slice(0, 5).map((attempt) => (
                  <div key={attempt.id} className="group relative overflow-hidden bg-white rounded-3xl p-4 sm:p-6 shadow-lg border border-gray-50 hover:border-indigo-100 transition-all min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                           attempt.percentage >= 70 ? 'bg-green-50 text-green-500' :
                           attempt.percentage >= 40 ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'
                        }`}>
                          <i className={`fas ${attempt.percentage >= 40 ? 'fa-check-double' : 'fa-brain'}`}></i>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors truncate">{attempt.exam_title}</h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                             <div className="flex items-center gap-1.5 text-gray-500">
                                <i className="far fa-calendar-alt text-xs"></i>
                                <span className="text-xs">{new Date(attempt.submitted_at).toLocaleDateString()}</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-gray-500">
                                <i className="far fa-clock text-xs"></i>
                                <span className="text-xs">{formatTime(attempt.duration_taken)}</span>
                             </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100 justify-between sm:justify-end">
                        <div className="text-center px-2">
                          <div className={`text-2xl sm:text-3xl font-bold ${
                            attempt.percentage >= 70 ? 'text-green-500' :
                            attempt.percentage >= 40 ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {attempt.percentage?.toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-400 font-medium mt-1">Score</div>
                        </div>

                        <Link to={`/results/${attempt.session_id || attempt.id}`}>
                           <button className="w-11 h-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-90">
                              <i className="fas fa-chevron-right text-xs"></i>
                           </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* SUBJECT PERFORMANCE & TIPS */}
        <div className="space-y-8">

           {/* SUBJECT PERFORMANCE */}
           <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-lg font-bold flex items-center gap-2">
                      <span className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                         <i className="fas fa-chart-bar"></i>
                      </span>
                      Subject Performance
                   </h3>
                   <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></div>
                </div>

                <div className="space-y-6">
                   {[
                      { name: 'Physics', color: 'bg-blue-400', progress: calculateSubjectStat(attemptHistory, 'Physics') },
                      { name: 'Chemistry', color: 'bg-emerald-400', progress: calculateSubjectStat(attemptHistory, 'Chemistry') },
                      { name: 'Mathematics', color: 'bg-indigo-400', progress: calculateSubjectStat(attemptHistory, 'Mathematics') },
                      { name: 'Biology', color: 'bg-rose-400', progress: calculateSubjectStat(attemptHistory, 'Biology') }
                   ].map(subject => (
                      <div key={subject.name} className="space-y-2">
                         <div className="flex justify-between items-end px-1">
                            <span className="text-xs font-medium text-white/60">{subject.name}</span>
                            <span className="text-lg font-bold text-white">{subject.progress}%</span>
                         </div>
                         <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                               className={`h-full ${subject.color} rounded-full transition-all duration-1000`}
                               style={{ width: `${subject.progress}%` }}
                            ></div>
                         </div>
                      </div>
                   ))}
                </div>

                <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                   <p className="text-xs font-medium text-white/60 leading-relaxed">
                      Focus on <span className="text-white font-semibold">{improveSubject}</span> to improve your overall score.
                   </p>
                </div>
              </div>

              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>
           </div>

           {/* SECURE EXAM INFO */}
           <section className="space-y-5">
              <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-sky-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden group hover:scale-[1.02] transition-all">
                 <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-xl">
                          <i className="fas fa-shield-alt"></i>
                       </div>
                       <div className="font-bold text-sm">Secure Exam Session</div>
                    </div>
                    <p className="text-sm text-blue-50/80 leading-relaxed">
                       Stay in the exam window and avoid switching tabs during the test.
                    </p>
                 </div>
                 <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
