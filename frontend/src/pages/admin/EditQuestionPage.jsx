import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { questionsAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

const EditQuestionPage = () => {
  const navigate = useNavigate();
  const { questionId } = useParams();
  const [searchParams] = useSearchParams();
  const examIdFromQuery = searchParams.get('examId');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    marks: 1,
    difficulty: 'MEDIUM'
  });
  const [examId, setExamId] = useState('');

  useEffect(() => {
    loadQuestion();
  }, [questionId]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const response = await questionsAPI.getById(questionId);
      const question = response.data.data;
      setExamId(question.exam_id || examIdFromQuery);
      setFormData({
        question_text: question.question_text || '',
        option_a: question.option_a || '',
        option_b: question.option_b || '',
        option_c: question.option_c || '',
        option_d: question.option_d || '',
        correct_option: question.correct_option || 'A',
        marks: question.marks || 1,
        difficulty: question.difficulty || 'MEDIUM'
      });
    } catch (err) {
      setError('Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        marks: parseInt(formData.marks)
      };

      await questionsAPI.update(questionId, payload);
      navigate(`/admin/exams/${examId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update question');
    } finally {
      setSubmitting(false);
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
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main-content">
        <header className="dashboard-header flex items-center gap-4 mb-10">
          <Link to={`/admin/exams/${examId}`} className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all active:scale-95">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="!m-0 text-2xl font-black text-gray-900">Edit Question</h1>
            <p className="!m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Content Refinement</p>
          </div>
        </header>

        <div className="">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div>
            <label htmlFor="question_text" className="block text-sm font-medium text-gray-700 mb-1">
              Question *
            </label>
            <textarea
              id="question_text"
              name="question_text"
              value={formData.question_text}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
              placeholder="Enter your question here..."
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Answer Options</h3>

            <div>
              <label htmlFor="option_a" className="block text-sm font-medium text-gray-700 mb-1">
                Option A
              </label>
              <input
                type="text"
                id="option_a"
                name="option_a"
                value={formData.option_a}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                placeholder="Enter option A"
              />
            </div>

            <div>
              <label htmlFor="option_b" className="block text-sm font-medium text-gray-700 mb-1">
                Option B
              </label>
              <input
                type="text"
                id="option_b"
                name="option_b"
                value={formData.option_b}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                placeholder="Enter option B"
              />
            </div>

            <div>
              <label htmlFor="option_c" className="block text-sm font-medium text-gray-700 mb-1">
                Option C
              </label>
              <input
                type="text"
                id="option_c"
                name="option_c"
                value={formData.option_c}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                placeholder="Enter option C"
              />
            </div>

            <div>
              <label htmlFor="option_d" className="block text-sm font-medium text-gray-700 mb-1">
                Option D
              </label>
              <input
                type="text"
                id="option_d"
                name="option_d"
                value={formData.option_d}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                placeholder="Enter option D"
              />
            </div>
          </div>

          {/* Correct Answer */}
          <div>
            <label htmlFor="correct_option" className="block text-sm font-medium text-gray-700 mb-1">
              Correct Answer *
            </label>
            <select
              id="correct_option"
              name="correct_option"
              value={formData.correct_option}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </div>

          {/* Marks and Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="marks" className="block text-sm font-medium text-gray-700 mb-1">
                Marks *
              </label>
              <input
                type="number"
                id="marks"
                name="marks"
                value={formData.marks}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
              />
            </div>

            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty *
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Updating...' : 'Update Question'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/admin/exams/${examId}`)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
        </div>
      </main>
    </div>
  );
};

export default EditQuestionPage;
