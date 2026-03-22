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
    try {
      setLoading(true);
      const [examsRes, historyRes] = await Promise.all([
        examsAPI.getAll({ is_active: 'true' }),
        attemptsAPI.getHistory()
      ]);
      
      const examsData = examsRes.data.data || [];
      const examsWithQuestions = examsData.filter(exam => exam.question_count > 0);
      
      setActiveExams(examsWithQuestions);
      setAttemptHistory(historyRes.data.data || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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

  // NEW: Calculate active streak
  const calculateStreak = (history) => {
    if (!history || history.length === 0) return 0;
    // Extract unique dates of attempts
    const attemptDates = history.map(h => new Date(h.submitted_at).toDateString());
    const uniqueDates = [...new Set(attemptDates)].map(d => new Date(d)).sort((a, b) => b - a);
    
    let streak = 0;
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const lastAttemptDate = new Date(uniqueDates[0]);
    lastAttemptDate.setHours(0,0,0,0);
    
    // Check if last attempt was today or yesterday
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

  // NEW: Calculate Mastery Level
  const getMasteryLevel = (history) => {
    if (!history || history.length === 0) return 'Awaiting Data';
    const avg = history.reduce((sum, h) => sum + (h.percentage || 0), 0) / history.length;
    if (avg >= 90) return 'Elite Scholar';
    if (avg >= 75) return 'Pro Achiever';
    if (avg >= 50) return 'Intermediate';
    return 'Rising Star';
  };

  // NEW: Find subject needing improvement
  const getSubjectToImprove = (history) => {
    const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    const stats = subjects.map(s => ({ name: s, score: calculateSubjectStat(history, s) }));
    const sorted = stats.filter(s => s.score > 0).sort((a, b) => a.score - b.score);
    return sorted.length > 0 ? sorted[0].name : 'General Prep';
  };

  const streak = calculateStreak(attemptHistory);
  const mastery = getMasteryLevel(attemptHistory);
  const improveSubject = getSubjectToImprove(attemptHistory);
  const avgPercentage = attemptHistory.length > 0 ? (attemptHistory.reduce((sum, h) => sum + (h.percentage || 0), 0) / attemptHistory.length).toFixed(1) : '0';

  return (
    <div className="space-y-10 pb-20 animate-fade-in">
      {/* PREMIUM GLASS HERO SECTION */}
      <div 
        className="relative overflow-hidden rounded-[48px] p-1 shadow-2xl shadow-blue-200/40 group"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #0ea5e9 100%)'
        }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30 group-hover:scale-105 transition-transform duration-10000"
          style={{ backgroundImage: `url('/src/assets/hero-bg.png')` }} 
        ></div>
        
        <div className="relative z-10 bg-white/5 backdrop-blur-xl rounded-[44px] p-10 md:p-14 border border-white/20 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-500/20 backdrop-blur-md rounded-2xl text-[10px] font-black mb-6 tracking-[0.2em] uppercase text-indigo-100 border border-white/10 shadow-inner">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
              Student Portal Active
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
              Welcome Back,<br/>
              <span className="bg-gradient-to-r from-white via-sky-200 to-indigo-100 bg-clip-text text-transparent">{user?.name || 'Academic Scholar'}</span>
            </h1>
            <p className="text-white/70 text-lg font-medium max-w-lg leading-relaxed mb-8">
              MHT-CET Intelligence Suite — Prepare with precision and conquer your entrance exams with Shree Science Academy.
            </p>
            <div className="flex flex-wrap gap-4">
               <div className="px-6 py-3 bg-white/95 text-blue-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-white hover:-translate-y-1 transition-all active:scale-95 cursor-default">
                  {mastery}
               </div>
               <div className="px-6 py-3 bg-indigo-600/40 backdrop-blur-md text-white border border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600/60 transition-all cursor-default flex items-center gap-2">
                  <i className="fas fa-fire text-orange-400"></i> {streak} Day Streak
               </div>
            </div>
          </div>
          
          <div className="hidden lg:block w-72 h-72 relative animate-float">
             <div className="absolute inset-0 bg-white/10 rounded-[60px] rotate-12 blur-xl"></div>
             <div className="bg-gradient-to-br from-white/20 to-transparent backdrop-blur-2xl rounded-[60px] border border-white/30 h-full w-full flex items-center justify-center p-8 overflow-hidden">
                <i className="fas fa-user-graduate text-white text-8xl opacity-40"></i>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                   <div 
                      className="h-full bg-white rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (attemptHistory.length / 10) * 100)}%` }}
                   ></div>
                </div>
             </div>
          </div>
        </div>
        
        {/* Floating background blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl mix-blend-soft-light"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl mix-blend-screen"></div>
      </div>

      {error && (
        <div className="bg-red-50/50 backdrop-blur-md border border-red-100 text-red-600 px-8 py-5 rounded-[32px] font-black text-sm flex items-center gap-4 animate-shake shadow-lg shadow-red-100/20">
          <i className="fas fa-exclamation-triangle text-lg"></i>
          {error}
        </div>
      )}

      {/* INTELLIGENCE METRIC GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-slide-up">
        {[
          { icon: 'fa-edit', color: 'blue', value: attemptHistory.length, label: 'Assessments' },
          { icon: 'fa-chart-pie', color: 'green', value: `${avgPercentage}%`, label: 'Mastery Rate' },
          { icon: 'fa-rocket', color: 'indigo', value: attemptHistory.reduce((sum, h) => sum + (h.score || 0), 0), label: 'Skill Points' },
          { icon: 'fa-stopwatch', color: 'sky', value: Math.round(attemptHistory.reduce((sum, h) => sum + (h.duration_taken || 0), 0) / 60), label: 'Study Minutes' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/40 border border-gray-50 flex flex-col items-center justify-center text-center group hover:-translate-y-2 transition-all duration-500">
            <div className={`w-14 h-14 bg-${stat.color}-50 text-${stat.color}-600 rounded-[20px] flex items-center justify-center mb-5 text-xl group-hover:scale-110 group-hover:bg-${stat.color}-600 group-hover:text-white transition-all duration-500 shadow-inner`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* ASSESSMENTS & PERFORMANCE LANE */}
        <div className="lg:col-span-2 space-y-12 animate-slide-up delay-200">
          
          {/* AVAILABLE EXAMS */}
          <section>
            <div className="flex items-center justify-between mb-8 px-2">
               <h2 className="text-2xl font-black text-gray-900 flex items-center gap-4">
                 <span className="w-3 h-10 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-200"></span>
                 Exam Laboratory
               </h2>
               <div className="flex items-center gap-3">
                  <span className="px-5 py-2 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">{activeExams.length} Available</span>
               </div>
            </div>

            {activeExams.length === 0 ? (
              <div className="bg-white rounded-[48px] border-4 border-dashed border-gray-50 p-20 flex flex-col items-center text-center group">
                 <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                    <i className="fas fa-ghost text-gray-200 text-5xl"></i>
                 </div>
                 <h3 className="text-xl font-bold text-gray-400 mb-2">The Lab is Quiet</h3>
                 <p className="text-gray-400 font-medium max-w-xs uppercase text-[10px] tracking-widest">Awaiting new assessment deployments from tutors</p>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2">
                {activeExams.map((exam, idx) => (
                  <div key={exam.id} className="relative group overflow-hidden rounded-[40px] shadow-2xl shadow-blue-200/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 group-hover:from-blue-600 group-hover:to-indigo-700 transition-all duration-700"></div>
                    
                    <div className="relative z-10 p-10 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="w-16 h-16 bg-blue-50/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-blue-600 text-2xl group-hover:bg-white group-hover:text-blue-600 group-hover:rotate-6 transition-all duration-500 shadow-sm ring-1 ring-blue-100 group-hover:ring-white">
                          <i className="fas fa-atom"></i>
                        </div>
                        <span className="text-[10px] font-black text-blue-700 bg-blue-100 group-hover:bg-white/20 group-hover:text-white px-4 py-2 rounded-xl uppercase tracking-widest transition-colors">
                          {exam.subject || 'GENERAL'}
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="font-extrabold text-xl text-gray-900 group-hover:text-white transition-colors line-clamp-1">{exam.title}</h3>
                        <p className="text-sm text-gray-400 group-hover:text-white/60 mt-2 line-clamp-2 font-medium leading-relaxed transition-colors">
                          {exam.description || 'Professional entrance preparation module for targeted MHT-CET subjects.'}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 py-6 border-t border-gray-100/50 group-hover:border-white/10 transition-colors">
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] text-gray-400 group-hover:text-white/40 font-black uppercase tracking-widest transition-colors">Time Limit</span>
                           <span className="text-base font-black text-gray-800 group-hover:text-white transition-colors">{exam.duration_minutes} Minutes</span>
                        </div>
                        <div className="flex flex-col gap-1 border-l pl-4 border-gray-100/50 group-hover:border-white/10 transition-colors">
                           <span className="text-[10px] text-gray-400 group-hover:text-white/40 font-black uppercase tracking-widest transition-colors">Volume</span>
                           <span className="text-base font-black text-gray-800 group-hover:text-white transition-colors">{exam.question_count} MCQs</span>
                        </div>
                      </div>

                      <Link to={`/exam/${exam.id}`} className="block transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <button className="w-full py-5 bg-white text-blue-700 font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3">
                           Deploy Exam <i className="fas fa-chevron-right text-[10px]"></i>
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PERFORMANCE ARCHIVE */}
          <section>
            <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-4">
                   <span className="w-3 h-10 bg-gradient-to-b from-indigo-600 to-sky-600 rounded-full shadow-lg shadow-indigo-100"></span>
                   Skill Progress
                </h2>
                <Link to="/profile" className="text-xs text-indigo-500 font-black hover:text-indigo-700 transition-colors uppercase tracking-widest">Intelligence Logs History</Link>
            </div>
            
            {attemptHistory.length === 0 ? (
              <div className="bg-white rounded-[40px] p-12 text-gray-400 text-center border-2 border-dashed border-gray-50 flex flex-col items-center">
                 <i className="fas fa-chart-line text-4xl mb-4 opacity-20"></i>
                 <p className="font-bold uppercase text-[10px] tracking-widest opacity-60">Begin your journey to track skill evolution</p>
              </div>
            ) : (
              <div className="space-y-6">
                {attemptHistory.slice(0, 5).map((attempt) => (
                  <div key={attempt.id} className="group relative overflow-hidden bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/30 border border-gray-50 hover:border-indigo-100 transition-all duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                      <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ${
                           attempt.percentage >= 70 ? 'bg-green-50 text-green-500' :
                           attempt.percentage >= 40 ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'
                        }`}>
                          <i className={`fas ${attempt.percentage >= 40 ? 'fa-check-double' : 'fa-brain'}`}></i>
                        </div>
                        <div>
                          <h3 className="font-black text-gray-800 text-lg group-hover:text-indigo-600 transition-colors leading-snug">{attempt.exam_title}</h3>
                          <div className="flex flex-wrap items-center gap-4 mt-2">
                             <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                                <i className="far fa-calendar-alt text-gray-300 text-xs"></i>
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{new Date(attempt.submitted_at).toLocaleDateString()}</span>
                             </div>
                             <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                                <i className="far fa-clock text-gray-300 text-xs"></i>
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{formatTime(attempt.duration_taken)} Spent</span>
                             </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 bg-gray-50/50 p-4 rounded-[28px] border border-gray-100/50 md:w-fit justify-between">
                        <div className="text-center px-4">
                          <div className={`text-4xl font-black leading-none ${
                            attempt.percentage >= 70 ? 'text-green-500' :
                            attempt.percentage >= 40 ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {attempt.percentage?.toFixed(0)}<span className="text-xl ml-0.5">%</span>
                          </div>
                          <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1.5 pl-1 opacity-70">Metric</div>
                        </div>
                        
                        <Link to={`/results/${attempt.session_id || attempt.id}`}>
                           <button className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-90">
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

        {/* STUDY COCKPIT & SUBJECT MASTERY */}
        <div className="space-y-10 animate-slide-up delay-400">
           
           {/* SUBJECT PERFORMANCE RADAR */}
           <div className="bg-slate-900 text-white rounded-[48px] p-10 shadow-2xl shadow-indigo-200 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-xl font-black flex items-center gap-3">
                      <span className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 shadow-inner ring-1 ring-white/10">
                         <i className="fas fa-dna"></i>
                      </span>
                      Subject DNA
                   </h3>
                   <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_#6366f1]"></div>
                </div>
                
                <div className="space-y-8">
                   {[
                      { name: 'Physics', color: 'bg-blue-400', progress: calculateSubjectStat(attemptHistory, 'Physics') },
                      { name: 'Chemistry', color: 'bg-emerald-400', progress: calculateSubjectStat(attemptHistory, 'Chemistry') },
                      { name: 'Mathematics', color: 'bg-indigo-400', progress: calculateSubjectStat(attemptHistory, 'Mathematics') },
                      { name: 'Biology', color: 'bg-rose-400', progress: calculateSubjectStat(attemptHistory, 'Biology') }
                   ].map(subject => (
                      <div key={subject.name} className="space-y-3">
                         <div className="flex justify-between items-end px-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{subject.name}</span>
                            <span className="text-lg font-black text-white leading-none">{subject.progress}%</span>
                         </div>
                         <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div 
                               className={`h-full ${subject.color} rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:brightness-110`}
                               style={{ width: `${subject.progress}%` }}
                            ></div>
                         </div>
                      </div>
                   ))}
                </div>

                <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                   <p className="text-xs font-medium text-white/50 leading-relaxed italic relative">
                      <i className="fas fa-quote-left absolute -top-2 -left-3 opacity-20 text-indigo-400"></i>
                      Excellent consistency. Keep focusing on {improveSubject} to reach your next academic milestone.
                   </p>
                </div>
              </div>
              
              {/* Abstract decorative circles */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
           </div>

           {/* KNOWLEDGE INSIGHTS */}
           <section className="space-y-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] pl-6 mb-2">Neural Insights</h3>
              
              <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-slate-200/40 border border-gray-50 flex flex-col gap-6 group hover:border-blue-100 transition-all duration-500">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                       <i className="fas fa-lightbulb"></i>
                    </div>
                    <div>
                       <div className="font-black text-gray-900 uppercase text-[10px] tracking-widest pl-0.5">MHT-CET Strategy</div>
                       <div className="text-sm font-bold text-gray-500 mt-0.5">Performance Analytics</div>
                    </div>
                 </div>
                 <p className="text-sm text-gray-500 leading-relaxed font-bold">
                    Your mastery in <span className="text-blue-600 font-extrabold decoration-sky-200 decoration-4 underline-offset-4 underline">{improveSubject}</span> has shown a positive trend. Targeted mock tests are recommended to maximize percentile.
                 </p>
                 <Link to="/exams" className="w-fit text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-3 py-2 group/btn">
                    Start Mock Test <i className="fas fa-arrow-right group-hover/btn:translate-x-1 transition-transform"></i>
                 </Link>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-sky-600 p-8 rounded-[40px] shadow-2xl shadow-blue-200 text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                 <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-5 mb-6">
                       <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-2xl group-hover:bg-white group-hover:text-blue-700 transition-all duration-500">
                          <i className="fas fa-fingerprint"></i>
                       </div>
                       <div className="font-black uppercase text-[10px] tracking-[0.2em]">Secure Session</div>
                    </div>
                    <p className="text-sm text-blue-50/80 leading-relaxed font-bold">
                       AI-Bio-Proctored sessions detected. Secure environment established. Please maintain focus within the active viewport.
                    </p>
                 </div>
                 <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
