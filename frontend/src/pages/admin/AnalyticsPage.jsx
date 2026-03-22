import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { examsAPI, attemptsAPI } from '../../services/api';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

const AnalyticsPage = () => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      loadExamStats();
    }
  }, [selectedExam]);

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

  const loadExamStats = async () => {
    try {
      const [attemptsRes, statsRes] = await Promise.all([
        attemptsAPI.getExamAttempts(selectedExam),
        examsAPI.getStats(selectedExam)
      ]);
      setAttempts(attemptsRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 70) return 'text-blue-600 bg-blue-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main-content">
        <header className="dashboard-header flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all active:scale-95">
              <i className="fas fa-arrow-left"></i>
            </Link>
            <div>
              <h1 className="!m-0 text-2xl font-black">Analytics</h1>
              <p className="!m-0 text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Performance Intelligence</p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {/* Exam Selector */}
          <Card className="!rounded-3xl border-none shadow-xl shadow-slate-200/50">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
              Select Exam Target
            </label>
            <select
              value={selectedExam || ''}
              onChange={(e) => setSelectedExam(e.target.value || null)}
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 appearance-none cursor-pointer"
            >
              <option value="">-- Choose an exam to analyze --</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} {exam.subject ? `[${exam.subject}]` : ''}
                </option>
              ))}
            </select>
          </Card>

          {selectedExam && stats && (
            <>
              {/* Overview Stats */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in w-full">
                <Card className="text-center !rounded-3xl border-none shadow-lg shadow-blue-100/20 py-8 group hover:-translate-y-1 transition-all">
                  <div className="text-4xl font-black text-blue-600 group-hover:scale-110 transition-transform">
                    {stats.attempts?.total_attempts || 0}
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Total Attempts</div>
                </Card>
                <Card className="text-center !rounded-3xl border-none shadow-lg shadow-green-100/20 py-8 group hover:-translate-y-1 transition-all">
                  <div className="text-4xl font-black text-green-600 group-hover:scale-110 transition-transform">
                    {stats.attempts?.avg_percentage?.toFixed(1) || 0}%
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Average Score</div>
                </Card>
                <Card className="text-center !rounded-3xl border-none shadow-lg shadow-yellow-100/20 py-8 group hover:-translate-y-1 transition-all">
                  <div className="text-4xl font-black text-yellow-500 group-hover:scale-110 transition-transform">
                    {stats.attempts?.top_percentage?.toFixed(1) || 0}%
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Top Score</div>
                </Card>
                <Card className="text-center !rounded-3xl border-none shadow-lg shadow-red-100/20 py-8 group hover:-translate-y-1 transition-all">
                  <div className="text-4xl font-black text-red-500 group-hover:scale-110 transition-transform">
                    {stats.attempts?.lowest_percentage?.toFixed(1) || 0}%
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Lowest Score</div>
                </Card>
              </div>

              {/* Performance Distribution */}
              <Card title="Performance Distribution" className="!rounded-3xl border-none shadow-xl shadow-slate-200/50 w-full">
                <div className="space-y-4">
                  {attempts.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No attempts yet</p>
                  ) : (
                    <>
                      {/* Grade Distribution */}
                      <div>
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Grade Distribution</h4>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { label: 'A+', range: '90-100%', color: 'bg-green-500' },
                            { label: 'A', range: '80-89%', color: 'bg-green-400' },
                            { label: 'B', range: '70-79%', color: 'bg-blue-500' },
                            { label: 'C', range: '60-69%', color: 'bg-yellow-500' },
                            { label: 'F', range: '<60%', color: 'bg-red-500' }
                          ].map((grade) => {
                            const count = attempts.filter(a => {
                              const p = a.percentage || 0;
                              if (grade.label === 'A+') return p >= 90;
                              if (grade.label === 'A') return p >= 80 && p < 90;
                              if (grade.label === 'B') return p >= 70 && p < 80;
                              if (grade.label === 'C') return p >= 60 && p < 70;
                              return p < 60;
                            }).length;
                            const percentage = attempts.length > 0 ? (count / attempts.length) * 100 : 0;

                            return (
                              <div key={grade.label} className="text-center">
                                <div className={`h-24 ${grade.color} rounded-t-xl flex items-end justify-center pb-2 transition-all hover:brightness-110`}>
                                  <span className="text-white font-black text-lg">{count}</span>
                                </div>
                                <div className="bg-gray-50 py-2 rounded-b-xl border border-gray-100">
                                  <div className="font-bold text-xs">{grade.label}</div>
                                  <div className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">{grade.range}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pass/Fail */}
                      <div className="pt-6 border-t border-gray-100">
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Pass/Fail Analysis</h4>
                        <div className="flex gap-4">
                          <div className="flex-1 bg-green-50/50 rounded-2xl p-6 text-center border border-green-100">
                            <div className="text-3xl font-black text-green-600">
                              {attempts.filter(a => (a.percentage || 0) >= 40).length}
                            </div>
                            <div className="text-[10px] text-green-700 font-bold uppercase tracking-widest mt-1">Candidates Passed</div>
                          </div>
                          <div className="flex-1 bg-red-50/50 rounded-2xl p-6 text-center border border-red-100">
                            <div className="text-3xl font-black text-red-600">
                              {attempts.filter(a => (a.percentage || 0) < 40).length}
                            </div>
                            <div className="text-[10px] text-red-700 font-bold uppercase tracking-widest mt-1">Candidates Failed</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* TOP PERFORMERS HONOR ROLL - ANIMATED PODIUM */}
              <div className="mb-10 group bg-white p-8 rounded-[40px] shadow-2xl shadow-blue-100/50 border border-blue-50/50 overflow-hidden relative w-full">
                 <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
                 <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                 
                 <div className="flex items-center justify-between mb-12 relative z-10">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                       <span className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl text-white shadow-lg shadow-yellow-200">
                          <i className="fas fa-trophy"></i>
                       </span>
                       Honor Roll
                    </h2>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-4 py-2 rounded-full border border-blue-100">MHT-CET Excellence</span>
                 </div>

                 <div className="grid grid-cols-3 gap-8 items-end pt-8 pb-6 px-4 relative z-10 w-full">
                    {/* 2nd Place */}
                    {attempts.length >= 2 && (
                      <div className="flex flex-col items-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="relative group/avatar">
                           <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full border-4 border-slate-200 shadow-xl flex items-center justify-center text-4xl overflow-hidden ring-4 ring-slate-50">
                              {attempts.sort((a,b) => b.percentage - a.percentage)[1].avatar ? <img src={attempts[1].avatar} alt="" className="w-full h-full object-cover" /> : '🥈'}
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-400 rounded-full border-4 border-white flex items-center justify-center text-white text-sm font-black shadow-lg">2</div>
                        </div>
                        <div className="text-center">
                           <div className="font-black text-slate-700 text-sm md:text-base line-clamp-1 truncate w-32">{attempts.sort((a,b) => b.percentage - a.percentage)[1].name || attempts[1].email.split('@')[0]}</div>
                           <div className="text-slate-500 font-bold text-xl">{attempts[1].percentage.toFixed(1)}%</div>
                        </div>
                        <div className="w-full bg-slate-200 h-24 md:h-32 rounded-t-[30px] shadow-2xl relative overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
                           <div className="absolute bottom-4 left-0 w-full text-center text-slate-400 font-black text-2xl tracking-widest opacity-40">SILVER</div>
                        </div>
                      </div>
                    )}

                    {/* 1st Place - Center */}
                    {attempts.length >= 1 && (
                      <div className="flex flex-col items-center gap-6 z-10 -mt-12 animate-slide-up">
                        <div className="relative">
                           <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce">
                              <i className="fas fa-crown text-yellow-400 text-4xl drop-shadow-xl"></i>
                           </div>
                           <div className="w-24 h-24 md:w-36 md:h-36 bg-white rounded-full border-[6px] border-yellow-400 shadow-2xl shadow-yellow-200 flex items-center justify-center text-6xl overflow-hidden ring-8 ring-yellow-50">
                              {attempts.sort((a,b) => b.percentage - a.percentage)[0].avatar ? <img src={attempts[0].avatar} alt="" className="w-full h-full object-cover" /> : '🥇'}
                           </div>
                           <div className="absolute -bottom-4 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-4 border-white flex items-center justify-center text-white text-lg font-black shadow-xl">1</div>
                        </div>
                        <div className="text-center">
                           <div className="font-black text-gray-900 text-base md:text-xl line-clamp-1 truncate w-40">{attempts.sort((a,b) => b.percentage - a.percentage)[0].name || attempts[0].email.split('@')[0]}</div>
                           <div className="text-yellow-600 font-black text-3xl md:text-4xl">{attempts[0].percentage.toFixed(1)}%</div>
                        </div>
                        <div className="w-full bg-gradient-to-b from-yellow-400 to-yellow-600 h-32 md:h-56 rounded-t-[40px] shadow-2xl relative overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent"></div>
                           <div className="absolute bottom-10 left-0 w-full text-center text-white/40 font-black text-4xl tracking-[0.2em]">GOLD</div>
                           <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-1000"></div>
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {attempts.length >= 3 && (
                      <div className="flex flex-col items-center gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <div className="relative">
                           <div className="w-14 h-14 md:w-20 md:h-20 bg-white rounded-full border-4 border-orange-200 shadow-xl flex items-center justify-center text-3xl overflow-hidden ring-4 ring-orange-50">
                              {attempts.sort((a,b) => b.percentage - a.percentage)[2].avatar ? <img src={attempts[2].avatar} alt="" className="w-full h-full object-cover" /> : '🥉'}
                           </div>
                           <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-orange-400 rounded-full border-4 border-white flex items-center justify-center text-white text-xs font-black shadow-lg">3</div>
                        </div>
                        <div className="text-center">
                           <div className="font-black text-orange-900/70 text-xs md:text-sm line-clamp-1 truncate w-24">{attempts.sort((a,b) => b.percentage - a.percentage)[2].name || attempts[2].email.split('@')[0]}</div>
                           <div className="text-orange-600 font-bold text-lg md:text-xl">{attempts[2].percentage.toFixed(1)}%</div>
                        </div>
                        <div className="w-full bg-orange-200 h-20 md:h-24 rounded-t-[24px] shadow-inner relative overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                           <div className="absolute bottom-2 left-0 w-full text-center text-orange-400 font-black text-xl tracking-widest opacity-40">BRONZE</div>
                        </div>
                      </div>
                    )}
                 </div>
              </div>

              {/* Performance Rankings and History */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Ranking Table */}
                <Card title="Detailed Performance Ranking" className="!rounded-[32px] border-none shadow-xl shadow-slate-200/50">
                  {attempts.length === 0 ? (
                    <p className="text-gray-400 text-center py-12 font-bold uppercase tracking-widest text-xs">No attempt data discovered</p>
                  ) : (
                    <div className="space-y-4">
                      {attempts
                        .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                        .slice(0, 8)
                        .map((attempt, idx) => (
                          <div
                            key={attempt.id}
                            className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${
                              idx < 3 ? 'bg-blue-50/20 border-blue-100 shadow-sm' : 'bg-gray-50 border-transparent hover:border-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${
                                idx === 0 ? 'bg-yellow-400 text-white' :
                                idx === 1 ? 'bg-slate-300 text-white' :
                                idx === 2 ? 'bg-orange-300 text-white' :
                                'bg-white text-gray-400 border border-gray-100'
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 truncate w-32 md:w-48 capitalize">
                                  {attempt.name || attempt.email.split('@')[0]}
                                </div>
                                <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">
                                   {attempt.correct_count} Correct Hits • {((attempt.duration_taken || 0) / 60).toFixed(0)} Min Session
                                </div>
                              </div>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-sm font-black ${getGradeColor(attempt.percentage || 0)} border border-white`}>
                              {attempt.percentage?.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>

                {/* Recent Activity */}
                <Card title="Recent Activity Logs" className="!rounded-[32px] border-none shadow-xl shadow-slate-200/50">
                  {attempts.length === 0 ? (
                    <p className="text-gray-400 text-center py-12 font-bold uppercase tracking-widest text-xs">Waiting for student activity...</p>
                  ) : (
                    <div className="space-y-3">
                      {attempts
                        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                        .slice(0, 8)
                        .map((attempt) => (
                          <div
                            key={attempt.id}
                            className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all rounded-2xl border border-transparent hover:border-blue-50"
                          >
                            <div className="flex items-center gap-3">
                               <div className="w-2 h-10 bg-blue-100 rounded-full"></div>
                               <div>
                                 <div className="font-bold text-gray-800 text-sm">
                                   {attempt.name || attempt.email.split('@')[0]}
                                 </div>
                                 <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                                   {new Date(attempt.submitted_at).toLocaleDateString()} at {new Date(attempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </div>
                               </div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-gray-900 text-sm">
                                {attempt.score}/{attempt.total_marks}
                              </div>
                              <div className={`text-[10px] font-black uppercase tracking-widest ${getGradeColor(attempt.percentage || 0)} bg-transparent !p-0`}>
                                {attempt.percentage?.toFixed(1)}% Score
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;
