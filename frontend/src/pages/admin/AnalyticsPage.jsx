import React, { useEffect, useState } from 'react';
import { examsAPI, attemptsAPI } from '../../services/api';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">View exam performance and statistics</p>
      </div>

      {/* Exam Selector */}
      <Card>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Exam
        </label>
        <select
          value={selectedExam || ''}
          onChange={(e) => setSelectedExam(e.target.value || null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 touch-target"
        >
          <option value="">-- Select an exam --</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.title} {exam.subject ? `- ${exam.subject}` : ''}
            </option>
          ))}
        </select>
      </Card>

      {selectedExam && stats && (
        <>
          {/* Overview Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {stats.attempts?.total_attempts || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Attempts</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.attempts?.avg_percentage?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Average Score</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {stats.attempts?.top_percentage?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Top Score</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {stats.attempts?.lowest_percentage?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Lowest Score</div>
            </Card>
          </div>

          {/* Performance Distribution */}
          <Card title="Performance Distribution">
            <div className="space-y-4">
              {attempts.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No attempts yet</p>
              ) : (
                <>
                  {/* Grade Distribution */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Grade Distribution</h4>
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
                            <div className={`h-24 ${grade.color} rounded-t flex items-end justify-center pb-2`}>
                              <span className="text-white font-bold text-lg">{count}</span>
                            </div>
                            <div className="bg-gray-100 py-2 rounded-b">
                              <div className="font-bold text-sm">{grade.label}</div>
                              <div className="text-xs text-gray-500">{grade.range}</div>
                              <div className="text-xs text-gray-400">{percentage.toFixed(0)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pass/Fail */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Pass/Fail Ratio</h4>
                    <div className="flex gap-4">
                      <div className="flex-1 bg-green-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {attempts.filter(a => (a.percentage || 0) >= 40).length}
                        </div>
                        <div className="text-sm text-green-700">Passed</div>
                      </div>
                      <div className="flex-1 bg-red-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {attempts.filter(a => (a.percentage || 0) < 40).length}
                        </div>
                        <div className="text-sm text-red-700">Failed</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Top Performers */}
          <Card title="Top Performers">
            {attempts.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No attempts yet</p>
            ) : (
              <div className="space-y-3">
                {attempts
                  .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                  .slice(0, 10)
                  .map((attempt, idx) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          idx === 0 ? 'bg-yellow-500' :
                          idx === 1 ? 'bg-gray-400' :
                          idx === 2 ? 'bg-orange-500' :
                          'bg-gray-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {attempt.name || attempt.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            {attempt.correct_count} correct, {attempt.incorrect_count} incorrect
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(attempt.percentage || 0)}`}>
                        {attempt.percentage?.toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* Recent Attempts */}
          <Card title="Recent Attempts">
            {attempts.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No attempts yet</p>
            ) : (
              <div className="space-y-2">
                {attempts
                  .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                  .slice(0, 10)
                  .map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {attempt.name || attempt.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(attempt.submitted_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          {attempt.score}/{attempt.total_marks}
                        </div>
                        <div className={`text-sm font-medium ${getGradeColor(attempt.percentage || 0)}`}>
                          {attempt.percentage?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
