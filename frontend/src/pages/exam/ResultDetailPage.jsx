import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { attemptsAPI } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatTime } from '../../hooks/useExamTimer';
import RichTextRenderer from '../../components/ui/RichTextRenderer';
import { getImageUrl } from '../../utils/imageHelper';

const ResultDetailPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const detailsRes = await attemptsAPI.getDetails(attemptId);
      const data = detailsRes.data.data;
      setResult(data);
      // exam info lives on the session itself
      if (data?.session) {
        setExam({ id: data.session.exam_id, title: data.session.exam_title });
      }
    } catch (error) {
      console.error('Failed to load result:', error);
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

  if (!result || !result.session) {
    return (
      <Card>
        <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-700 mb-4">Result not found</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </Card>
    );
  }

  const { session, responses } = result;
  // Use percentage stored in session (from attempt_history) or calculate from score/total_marks
  // Cap at 100 — old records may have been stored with percentage > 100 due to
  // an admin-set total_marks that was lower than the actual sum of question marks.
  const rawPct = session.percentage != null
    ? parseFloat(session.percentage)
    : (session.score && session.total_marks ? (parseFloat(session.score) / parseFloat(session.total_marks)) * 100 : 0);
  const percentage = Math.min(100, Math.max(0, rawPct || 0));

  const getGrade = (pct) => {
    if (pct >= 90) return { grade: 'A+', color: 'text-green-600' };
    if (pct >= 80) return { grade: 'A', color: 'text-green-600' };
    if (pct >= 70) return { grade: 'B', color: 'text-blue-600' };
    if (pct >= 60) return { grade: 'C', color: 'text-yellow-600' };
    if (pct >= 40) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  const grade = getGrade(percentage);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Score Card */}
      <Card className="bg-gradient-to-br from-primary-50 to-white">
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{exam?.title || session.exam_title}</h1>
            <p className="text-gray-600 mt-1">
              Submitted on {new Date(session.submitted_at).toLocaleDateString()} at{' '}
              {new Date(session.submitted_at).toLocaleTimeString()}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-600">{session.score}</div>
              <div className="text-sm text-gray-600 mt-1">Score</div>
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${grade.color}`}>{grade.grade}</div>
              <div className="text-sm text-gray-600 mt-1">Grade</div>
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${
                percentage >= 70 ? 'text-green-600' :
                percentage >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Percentage</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t max-w-md mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{session.correct_count}</div>
              <div className="text-xs text-gray-600 mt-1">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {session.attempted_count - session.correct_count}
              </div>
              <div className="text-xs text-gray-600 mt-1">Incorrect</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {session.total_questions - session.attempted_count}
              </div>
              <div className="text-xs text-gray-600 mt-1">Unattempted</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Solutions Review */}
      <Card title="Detailed Solutions">
        <div className="space-y-6">
          {responses.map((response, idx) => (
            <div
              key={response.id}
              className={`border rounded-lg p-4 ${
                response.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Question {idx + 1}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    response.is_correct
                      ? 'bg-green-200 text-green-700'
                      : 'bg-red-200 text-red-700'
                  }`}>
                    {response.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                  {response.marks_awarded > 0 && (
                    <span className="text-xs text-green-600 font-medium">
                      +{response.marks_awarded} marks
                    </span>
                  )}
                  {response.marks_awarded < 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      {response.marks_awarded} marks
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-3">
                {response.question_type === 'IMAGE' ? (
                  <div className="mb-2 flex justify-center">
                    <img
                      src={getImageUrl(response.image_url)}
                      alt="Question"
                      className="max-w-full h-auto object-contain rounded-lg border-2 border-gray-200 shadow-sm"
                      style={{ maxHeight: '500px' }}
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <RichTextRenderer content={response.question_text} className="text-gray-900 font-medium" />
                )}
                {response.question_type === 'TEXT' && response.image_url && (
                  <div className="mt-2 mb-3 flex justify-center">
                    <img
                      src={getImageUrl(response.image_url)}
                      alt="Question diagram"
                      className="max-w-full h-auto object-contain rounded-lg border-2 border-gray-200 shadow-sm"
                      style={{ maxHeight: '400px' }}
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D'].map((option) => {
                  const optionValue = response[`option_${option.toLowerCase()}`];
                  const optionImage = response[`option_${option.toLowerCase()}_image_url`];
                  const isCorrect = option === response.correct_option;
                  const isSelected = option === response.selected_option;
                  const hasText = optionValue && optionValue.trim();
                  const hasImage = optionImage;

                  return (
                    <div
                      key={option}
                      className={`p-3 rounded-lg border-2 ${
                        isCorrect
                          ? 'border-green-500 bg-green-100'
                          : isSelected
                          ? 'border-red-500 bg-red-100'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-gray-700 flex-shrink-0">{option}.</span>
                          <div className="flex-1 flex flex-col gap-2">
                            {/* Render text if exists */}
                            {hasText && (
                              <RichTextRenderer content={optionValue} className="text-gray-900" />
                            )}
                            {/* Render image if exists */}
                            {hasImage && (
                              <div className="flex justify-center">
                                <img
                                  src={getImageUrl(optionImage)}
                                  alt={`Option ${option}`}
                                  className="max-w-full h-auto object-contain rounded-lg border-2 border-gray-200 shadow-sm"
                                  style={{ maxHeight: '200px' }}
                                  loading="lazy"
                                  onError={(e) => {
                                    console.error(`Failed to load option ${option} image in results:`, {
                                      attemptedUrl: getImageUrl(optionImage),
                                      originalPath: optionImage
                                    });
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            {/* Show placeholder if neither */}
                            {!hasText && !hasImage && (
                              <div className="text-gray-400 italic text-sm">No content</div>
                            )}
                          </div>
                          {isCorrect && (
                            <span className="ml-auto text-green-600 text-lg">✓</span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="ml-auto text-red-600 text-lg">✗</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation Section */}
              {(response.explanation || response.explanation_image_url) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <i className="fas fa-info-circle text-blue-500"></i>
                    Explanation
                  </h4>
                  {response.explanation && (
                    <RichTextRenderer content={response.explanation} className="text-gray-600 text-sm" />
                  )}
                  {response.explanation_image_url && (
                    <div className="mt-2 text-center sm:text-left">
                      <img
                        src={getImageUrl(response.explanation_image_url)}
                        alt="Explanation diagram"
                        className="max-w-full h-auto object-contain rounded-lg border-2 border-gray-100 shadow-sm"
                        style={{ maxHeight: '250px' }}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {response.selected_option !== response.correct_option && (
                <div className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">Your answer:</span> {response.selected_option || 'Not answered'}
                  <span className="mx-2">•</span>
                  <span className="font-medium text-green-600">Correct answer:</span> {response.correct_option}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={() => navigate('/dashboard')} className="flex-1">
          Back to Dashboard
        </Button>
        {exam && (
          <Link to={`/exam/${exam.id}`}>
            <Button variant="outline">Retake Exam</Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default ResultDetailPage;
