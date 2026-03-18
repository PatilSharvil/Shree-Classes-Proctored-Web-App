import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { examsAPI, attemptsAPI } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatTime } from '../../hooks/useExamTimer';

const StudentDashboard = () => {
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
        examsAPI.getActive(),
        attemptsAPI.getHistory()
      ]);
      setActiveExams(examsRes.data.data || []);
      setAttemptHistory(historyRes.data.data || []);
    } catch (err) {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to your exam dashboard</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Active Exams */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Exams</h2>
        {activeExams.length === 0 ? (
          <Card>
            <p className="text-gray-600 text-center py-8">No active exams at the moment</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeExams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{exam.title}</h3>
                    {exam.subject && (
                      <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded inline-block mt-1">
                        {exam.subject}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">{exam.description}</p>
                  
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    <span>⏱️ {exam.duration_minutes} min</span>
                    <span>📊 {exam.total_marks} marks</span>
                    <span>❓ {exam.question_count} questions</span>
                  </div>

                  <Link to={`/exam/${exam.id}`}>
                    <Button fullWidth>Start Exam</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Attempt History */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Attempt History</h2>
        {attemptHistory.length === 0 ? (
          <Card>
            <p className="text-gray-600 text-center py-8">You haven't attempted any exams yet</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {attemptHistory.map((attempt) => (
              <Card key={attempt.id}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{attempt.exam_title}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(attempt.submitted_at).toLocaleDateString()} at{' '}
                      {new Date(attempt.submitted_at).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        attempt.percentage >= 70 ? 'text-green-600' :
                        attempt.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {attempt.percentage?.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {attempt.correct_count}/{attempt.correct_count + attempt.incorrect_count} correct
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-gray-600">
                      <div>Score: {attempt.score}/{attempt.total_marks}</div>
                      <div>Time: {formatTime(attempt.duration_taken)}</div>
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
