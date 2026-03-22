import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { questionsAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

const AddQuestionPage = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    marks: 1,
    negative_marks: 0,
    difficulty: 'MEDIUM',
    explanation: ''
  });

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
    setLoading(true);

    try {
      const payload = {
        ...formData,
        marks: parseInt(formData.marks),
        negative_marks: parseFloat(formData.negative_marks) || 0
      };

      await questionsAPI.add(examId, payload);
      navigate(`/admin/exams/${examId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add question');
    } finally {
      setLoading(false);
    }
  };

  const options = [
    { key: 'A', field: 'option_a', label: 'Option A' },
    { key: 'B', field: 'option_b', label: 'Option B' },
    { key: 'C', field: 'option_c', label: 'Option C' },
    { key: 'D', field: 'option_d', label: 'Option D' }
  ];

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main-content">
        <header className="dashboard-header flex items-center gap-4 mb-10">
          <Link to={`/admin/exams/${examId}`} className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all active:scale-95">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="!m-0 text-2xl font-black text-gray-900">Add Question</h1>
            <p className="!m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Content Creation</p>
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

          {/* Options with inline correct answer radio */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Answer Options</h3>
              <span className="text-xs text-gray-500 bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded">
                ✓ Click the circle to mark the correct answer
              </span>
            </div>

            {options.map(({ key, field, label }) => {
              const isCorrect = formData.correct_option === key;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, correct_option: key }))}
                >
                  {/* Radio indicator */}
                  <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isCorrect
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-400'
                  }`}>
                    {isCorrect && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </div>

                  {/* Option label badge */}
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {key}
                  </span>

                  {/* Text input */}
                  <input
                    type="text"
                    name={field}
                    value={formData[field]}
                    onChange={handleChange}
                    required
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    placeholder={`Enter ${label}...`}
                  />

                  {isCorrect && (
                    <span className="text-xs font-semibold text-green-600 flex-shrink-0">✓ Correct</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Marks, Negative Marks and Difficulty */}
          <div className="grid grid-cols-3 gap-4">
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
              <label htmlFor="negative_marks" className="block text-sm font-medium text-gray-700 mb-1">
                Negative Marks
              </label>
              <input
                type="number"
                id="negative_marks"
                name="negative_marks"
                value={formData.negative_marks}
                onChange={handleChange}
                min="0"
                step="0.25"
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

          {/* Optional Explanation */}
          <div>
            <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
              Explanation <span className="text-gray-400 font-normal">(optional — shown after exam)</span>
            </label>
            <textarea
              id="explanation"
              name="explanation"
              value={formData.explanation}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Briefly explain why this answer is correct..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Question'}
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

export default AddQuestionPage;


