import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { examsAPI, questionsAPI, attemptsAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ExamManagePage = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('questions');

  useEffect(() => {
    loadData();
  }, [examId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examRes, questionsRes, attemptsRes] = await Promise.all([
        examsAPI.getById(examId),
        questionsAPI.getByExam(examId, { includeCorrect: 'true' }),
        attemptsAPI.getExamAttempts(examId)
      ]);
      setExam(examRes.data.data);
      setQuestions(questionsRes.data.data || []);
      setAttempts(attemptsRes.data.data || []);
    } catch (err) {
      setError('Failed to load exam data');
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

  if (!exam) {
    return (
      <Card>
        <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-700 mb-4">Exam not found</p>
        <Link to="/admin/exams">
          <Button>Back to Exams</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
          <p className="text-gray-600 mt-1">
            {exam.subject} • {exam.duration_minutes} minutes • {questions.length} questions
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/exams/${examId}/edit`}>
            <Button variant="secondary">Edit Exam</Button>
          </Link>
          <Link to={`/admin/exams/${examId}/questions/new`}>
            <Button>+ Add Question</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-primary-600">{questions.length}</div>
          <div className="text-sm text-gray-600">Questions</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-green-600">{attempts.length}</div>
          <div className="text-sm text-gray-600">Attempts</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {attempts.length > 0 
              ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length)
              : 0}%
          </div>
          <div className="text-sm text-gray-600">Avg Score</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {exam.is_active ? 'Active' : 'Inactive'}
          </div>
          <div className="text-sm text-gray-600">Status</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'questions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('attempts')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'attempts'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Attempts ({attempts.length})
          </button>
        </nav>
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No questions added yet</p>
                <Link to={`/admin/exams/${examId}/questions/new`}>
                  <Button>Add First Question</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <Card key={q.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">Q{idx + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          q.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">{q.marks} marks</span>
                      </div>
                      <p className="text-gray-900 mb-3">{q.question_text}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className={`p-2 rounded ${q.correct_option === 'A' ? 'bg-green-100 text-green-700' : 'bg-gray-50'}`}>
                          <span className="font-medium">A.</span> {q.option_a}
                        </div>
                        <div className={`p-2 rounded ${q.correct_option === 'B' ? 'bg-green-100 text-green-700' : 'bg-gray-50'}`}>
                          <span className="font-medium">B.</span> {q.option_b}
                        </div>
                        <div className={`p-2 rounded ${q.correct_option === 'C' ? 'bg-green-100 text-green-700' : 'bg-gray-50'}`}>
                          <span className="font-medium">C.</span> {q.option_c}
                        </div>
                        <div className={`p-2 rounded ${q.correct_option === 'D' ? 'bg-green-100 text-green-700' : 'bg-gray-50'}`}>
                          <span className="font-medium">D.</span> {q.option_d}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link to={`/admin/questions/${q.id}/edit?examId=${examId}`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attempts Tab */}
      {activeTab === 'attempts' && (
        <div className="space-y-4">
          {attempts.length === 0 ? (
            <Card>
              <p className="text-gray-600 text-center py-8">No attempts yet</p>
            </Card>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Percentage</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{attempt.name || attempt.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {attempt.score}/{attempt.total_marks}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${
                          attempt.percentage >= 70 ? 'text-green-600' :
                          attempt.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {attempt.percentage?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          attempt.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' :
                          attempt.status?.includes('AUTO') ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {attempt.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(attempt.submitted_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamManagePage;
