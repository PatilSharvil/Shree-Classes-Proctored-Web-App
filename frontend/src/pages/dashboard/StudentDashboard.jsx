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
      // Fetch all active exams
      const [examsRes, historyRes] = await Promise.all([
        examsAPI.getAll({ is_active: 'true' }),
        attemptsAPI.getHistory()
      ]);
      
      const examsData = examsRes.data.data || [];
      console.log('Fetched exams:', examsData);
      
      // Filter exams that have questions
      const examsWithQuestions = examsData.filter(exam => exam.question_count > 0);
      console.log('Exams with questions:', examsWithQuestions);
      
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
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-100">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {user?.name || 'Student'}!</h1>
            <p className="text-blue-100 mt-2 text-lg">Shree Science Academy - MHT CET Portal</p>
          </div>
        </div>
        {/* Abstract shape decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Active Exams */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
          Available MHT CET Exams
        </h2>
        {activeExams.length === 0 ? (
          <Card className="border-dashed border-2">
            <p className="text-gray-500 text-center py-12 italic">
              No active exams available at the moment. Check back soon!<br/>
              <span className="text-sm">(Exams will appear here once admin creates them with questions)</span>
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeExams.map((exam) => (
              <Card key={exam.id} className="group hover:-translate-y-2 transition-all duration-300 border-none shadow-lg shadow-blue-50">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                      <i className="fas fa-file-invoice"></i>
                    </div>
                    {exam.subject && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/50 px-2 py-1 rounded-full uppercase tracking-widest">
                        {exam.subject}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">{exam.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{exam.description || 'No description available.'}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 py-2 border-y border-gray-50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                      <i className="far fa-clock text-blue-400"></i> {exam.duration_minutes}m
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                      <i className="far fa-star text-blue-400"></i> {exam.total_marks} pts
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                      <i className="fas fa-tasks text-blue-400"></i> {exam.question_count} Qs
                    </div>
                  </div>

                  <Link to={`/exam/${exam.id}`} className="block">
                    <Button fullWidth className="!rounded-xl py-3 font-bold shadow-md hover:shadow-blue-200 transition-all">
                      Start Test <i className="fas fa-arrow-right ml-2 text-xs"></i>
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Attempt History */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
          Your Performance History
        </h2>
        {attemptHistory.length === 0 ? (
          <Card className="border-dashed border-2">
            <p className="text-gray-500 text-center py-12 italic">You haven't attempted any exams yet. Time to start practicing!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {attemptHistory.map((attempt) => (
              <Card key={attempt.id} className="group hover:border-purple-200 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 text-xl">
                      <i className="fas fa-history"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg group-hover:text-purple-600 transition-colors">{attempt.exam_title}</h3>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
                        <i className="far fa-calendar-alt mr-1"></i> {new Date(attempt.submitted_at).toLocaleDateString()}
                        <span className="mx-2 font-light">|</span>
                        <i className="far fa-clock mr-1"></i> {new Date(attempt.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="text-center">
                      <div className={`text-3xl font-black ${
                        attempt.percentage >= 70 ? 'text-green-600' :
                        attempt.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {attempt.percentage?.toFixed(1)}<span className="text-sm font-bold ml-0.5">%</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Accuracy</div>
                    </div>
                    
                    <div className="h-10 w-px bg-gray-200"></div>

                    <div className="space-y-1">
                      <div className="text-sm font-bold text-gray-700 flex justify-between gap-4">
                        <span className="text-gray-400 font-medium uppercase text-[10px] tracking-widest">Score</span>
                        <span>{attempt.score}/{attempt.total_marks}</span>
                      </div>
                      <div className="text-sm font-bold text-gray-700 flex justify-between gap-4">
                        <span className="text-gray-400 font-medium uppercase text-[10px] tracking-widest">Time</span>
                        <span>{formatTime(attempt.duration_taken)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentDashboard;
