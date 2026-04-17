import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { examsAPI, questionsAPI, attemptsAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminSidebar from '../../components/layout/AdminSidebar';
import RichTextRenderer from '../../components/ui/RichTextRenderer';
import { getImageUrl } from '../../utils/imageHelper';
import './AdminDashboard.css';

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
      setError('');
      const [examRes, questionsRes, attemptsRes] = await Promise.all([
        examsAPI.getById(examId),
        questionsAPI.getByExam(examId, { includeCorrect: 'true' }),
        attemptsAPI.getExamAttempts(examId)
      ]);
      setExam(examRes.data.data);
      setQuestions(questionsRes.data.data || []);
      setAttempts(attemptsRes.data.data || []);
    } catch (err) {
      console.error('Error loading exam data:', err);
      if (err.response?.status === 404) {
        setError('Exam not found');
      } else {
        setError('Failed to load exam data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <AdminSidebar />
        <main className="admin-main-content flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="admin-dashboard-container">
        <AdminSidebar />
        <main className="admin-main-content">
          <Card className="max-w-md mx-auto mt-10">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-2xl"></i>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Exam not found'}</h2>
              <p className="text-gray-600 mb-6">
                {error === 'Exam not found' 
                  ? "The exam you're looking for doesn't exist or has been deleted." 
                  : "There was a problem connecting to the server."}
              </p>
              <Link to="/admin/exams">
                <Button variant="primary">Back to Exams</Button>
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main-content">
        <header className="dashboard-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <Link to="/admin/exams" className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all active:scale-95">
              <i className="fas fa-arrow-left"></i>
            </Link>
            <div>
              <h1 className="!m-0 text-2xl font-black text-gray-900">{exam.title}</h1>
              <p className="!m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                {exam.subject} • {exam.duration_minutes} minutes • {questions.length} questions
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/admin/exams/${examId}/proctoring`}>
              <button className="px-4 py-2 bg-purple-600 text-white font-bold text-sm rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-100">
                📊 Proctoring
              </button>
            </Link>
            <Link to={`/admin/exams/${examId}/edit`}>
              <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                Edit Exam
              </button>
            </Link>
            <Link to={`/admin/exams/${examId}/questions/new`}>
              <button className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                + Add Question
              </button>
            </Link>
          </div>
        </header>

        <div className="space-y-6">

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
                      {q.question_type === 'IMAGE' ? (
                        <div className="mb-3 flex justify-center">
                          <img
                            src={getImageUrl(q.image_url)}
                            alt="Question"
                            className="max-w-full h-auto object-contain rounded-lg border-2 border-gray-200 shadow-sm"
                            style={{ maxHeight: '350px' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <RichTextRenderer content={q.question_text} className="text-gray-900 mb-3" />
                      )}
                      {q.question_type === 'TEXT' && q.image_url && (
                        <div className="mb-3 flex justify-center">
                          <img
                            src={getImageUrl(q.image_url)}
                            alt="Question diagram"
                            className="max-w-full h-auto object-contain rounded-lg border-2 border-gray-100 shadow-sm"
                            style={{ maxHeight: '250px' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className={`p-2 rounded ${q.correct_option === 'A' ? 'bg-green-100 text-green-700' : 'bg-gray-50'}`}>
                          <div className="flex gap-2">
                            <span className="font-medium">A.</span>
                            <div className="flex-1">
                              <RichTextRenderer content={q.option_a} />
                              {q.option_a_image_url && (
                                <img src={getImageUrl(q.option_a_image_url)} alt="A" className="h-12 mt-1 rounded border border-gray-200 object-contain" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`p-2 rounded ${q.correct_option === 'B' ? 'bg-green-100 text-green-700' : 'bg-gray-50'}`}>
                          <div className="flex gap-2">
                            <span className="font-medium">B.</span>
                            <div className="flex-1">
                              <RichTextRenderer content={q.option_b} />
                              {q.option_b_image_url && (
                                <img src={getImageUrl(q.option_b_image_url)} alt="B" className="h-12 mt-1 rounded border border-gray-200 object-contain" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`p-2 rounded ${q.correct_option === 'C' ? 'bg-green-100 text-green-700' : 'bg-gray-50'}`}>
                          <div className="flex gap-2">
                            <span className="font-medium">C.</span>
                            <div className="flex-1">
                              <RichTextRenderer content={q.option_c} />
                              {q.option_c_image_url && (
                                <img src={getImageUrl(q.option_c_image_url)} alt="C" className="h-12 mt-1 rounded border border-gray-200 object-contain" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`p-2 rounded ${q.correct_option === 'D' ? 'bg-green-100 text-green-700' : 'bg-gray-50'}`}>
                          <div className="flex gap-2">
                            <span className="font-medium">D.</span>
                            <div className="flex-1">
                              <RichTextRenderer content={q.option_d} />
                              {q.option_d_image_url && (
                                <img src={getImageUrl(q.option_d_image_url)} alt="D" className="h-12 mt-1 rounded border border-gray-200 object-contain" />
                              )}
                            </div>
                          </div>
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
                  {attempts
                    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                    .map((attempt, idx) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <tr key={attempt.id} className={`hover:bg-gray-50 ${idx < 3 ? 'bg-blue-50/30' : ''}`}>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2 font-medium text-gray-900">
                              {idx < 3 && <span>{medals[idx]}</span>}
                              {attempt.name || attempt.email}
                            </div>
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
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
        </div>
      </main>
    </div>
  );
};

export default ExamManagePage;
