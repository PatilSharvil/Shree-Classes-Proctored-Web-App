import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { questionsAPI, uploadAPI } from '../../services/api';
import { sanitizeText } from '../../utils/sanitizer';
import { getImageUrl } from '../../utils/imageHelper';
import MathEquationEditor from '../../components/ui/MathEquationEditor';
import RichTextRenderer from '../../components/ui/RichTextRenderer';
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
    question_type: 'TEXT',
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
  const [images, setImages] = useState({
    image_url: null,
    option_a_image_url: null,
    option_b_image_url: null,
    option_c_image_url: null,
    option_d_image_url: null,
    explanation_image_url: null
  });
  const [existingImages, setExistingImages] = useState({
    image_url: null,
    option_a_image_url: null,
    option_b_image_url: null,
    option_c_image_url: null,
    option_d_image_url: null,
    explanation_image_url: null
  });
  const [examId, setExamId] = useState('');
  const [showEquationEditor, setShowEquationEditor] = useState(false);
  const [equationTargetField, setEquationTargetField] = useState('question_text');

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
        question_type: question.question_type || 'TEXT',
        question_text: question.question_text || '',
        option_a: question.option_a || '',
        option_b: question.option_b || '',
        option_c: question.option_c || '',
        option_d: question.option_d || '',
        correct_option: question.correct_option || 'A',
        marks: question.marks || 1,
        negative_marks: question.negative_marks || 0,
        difficulty: question.difficulty || 'MEDIUM',
        explanation: question.explanation || ''
      });
      setExistingImages({
        image_url: question.image_url,
        option_a_image_url: question.option_a_image_url,
        option_b_image_url: question.option_b_image_url,
        option_c_image_url: question.option_c_image_url,
        option_d_image_url: question.option_d_image_url,
        explanation_image_url: question.explanation_image_url
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

  /**
   * Sanitize and fix malformed LaTeX in form fields
   */
  const sanitizeLaTeX = (text) => {
    if (!text || !text.trim()) return text;

    let sanitized = text.trim();

    // Fix 1: If text ends with $$ but doesn't start with $$, add $$ at beginning
    if (sanitized.endsWith('$$') && !sanitized.startsWith('$$')) {
      sanitized = `$$ ${sanitized.replace(/\s*\$\$\s*$/, '').trim()} $$`;
    }

    // Fix 2: If text has $$ only at start but not at end, add $$ at end
    if (sanitized.startsWith('$$') && !sanitized.endsWith('$$')) {
      sanitized = `${sanitized.replace(/^\$\$\s*/, '').trim()} $$`;
    }

    // Fix 3: Remove double $$ like $$$$ or $$ $$
    sanitized = sanitized.replace(/\$\$\s*\$\$/g, '$$');

    // Fix 4: If has LaTeX commands but no $$ wrappers, add them
    const hasLatexCommands = /\\(lim|frac|sqrt|sin|cos|tan|ln|log|to|infty|pi|times|int|sum|prod|div|pm)/.test(sanitized);
    if (hasLatexCommands && !sanitized.includes('$$')) {
      sanitized = `$$ ${sanitized} $$`;
    }

    // Fix 5: Fix unbalanced parentheses
    const openParenCount = (sanitized.match(/\(/g) || []).length;
    const closeParenCount = (sanitized.match(/\)/g) || []).length;
    if (openParenCount > closeParenCount) {
      sanitized += ')'.repeat(openParenCount - closeParenCount);
    }

    return sanitized;
  };

  /**
   * Auto-format pasted math text into LaTeX
   */
  const formatMathToLatex = (text) => {
    if (!text || !text.trim()) return text;

    const trimmed = text.trim();

    // If already properly formatted LaTeX, return as-is
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      return trimmed;
    }

    // If text already contains LaTeX commands (has backslashes), just wrap in $$ if needed
    if (trimmed.includes('\\')) {
      if (!trimmed.includes('$$')) {
        return `$$ ${trimmed} $$`;
      }
      return sanitizeLaTeX(trimmed);
    }

    let formatted = trimmed;

    // Fix spaced letters: "s i n" → "sin", "l i m" → "lim"
    formatted = formatted.replace(/\b([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\b/g, '$1$2$3');
    formatted = formatted.replace(/\b([a-zA-Z])\s+([a-zA-Z])\b/g, '$1$2');

    // Unicode superscripts → LaTeX exponents
    formatted = formatted.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (match) => {
      const map = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'};
      return `^${map[match]}`;
    });

    // Unicode subscripts → LaTeX subscripts
    formatted = formatted.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (match) => {
      const map = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
      return `_${map[match]}`;
    });

    // Superscript plus/minus for one-sided limits: 0⁺ → 0^+
    formatted = formatted.replace(/⁺/g, '^+');
    formatted = formatted.replace(/⁻/g, '^-');

    // ∞ BEFORE limit regex so it gets captured as \infty in $3
    formatted = formatted.replace(/∞/g, '\\infty');

    // Limits: lim x→0 or lim x->0 or limx→∞ → \lim_{x \to 0}
    // Must run BEFORE → is converted to \to below
    // /gi flag: case-insensitive, global (multiple limits)
    formatted = formatted.replace(/lim\s*([a-zA-Z])\s*(→|->|⟶|⇒)\s*([^\s\)\},]+)/gi, '\\lim_{$1 \\to $3}');

    // Unicode math symbols → LaTeX
    formatted = formatted.replace(/√/g, '\\sqrt');
    formatted = formatted.replace(/∫/g, '\\int');
    formatted = formatted.replace(/∑/g, '\\sum');
    formatted = formatted.replace(/∏/g, '\\prod');
    // ∞ already handled before limit regex
    formatted = formatted.replace(/π/g, '\\pi');
    formatted = formatted.replace(/→/g, '\\to');
    formatted = formatted.replace(/⟶/g, '\\to');
    formatted = formatted.replace(/≠/g, '\\neq');
    formatted = formatted.replace(/≤/g, '\\leq');
    formatted = formatted.replace(/≥/g, '\\geq');
    formatted = formatted.replace(/±/g, '\\pm');
    formatted = formatted.replace(/×/g, '\\times');
    formatted = formatted.replace(/÷/g, '\\div');

    // Exponential notation: ex → e^{x}
    formatted = formatted.replace(/\be([a-zA-Z])\b/g, 'e^{$1}');

    // Logarithms & Trig functions
    formatted = formatted.replace(/\bl\s*n\s*\(/gi, '\\ln(');
    formatted = formatted.replace(/\blog\s*\(/g, '\\log(');
    formatted = formatted.replace(/\blogₑ\s*/g, '\\ln ');
    formatted = formatted.replace(/\bsin\s*\(/g, '\\sin(');
    formatted = formatted.replace(/\bcos\s*\(/g, '\\cos(');
    formatted = formatted.replace(/\btan\s*\(/g, '\\tan(');

    // Fractions: (expr)/x or a/b → \frac{a}{b}
    formatted = formatted.replace(/\(([^)]+)\)\s*\/\s*([a-zA-Z0-9^{}]+)/g, '\\frac{$1}{$2}');
    formatted = formatted.replace(/([a-zA-Z0-9^{}]+)\s*\/\s*([a-zA-Z0-9^{}]+)/g, '\\frac{$1}{$2}');

    // Square roots: sqrt(x) → \sqrt{x}
    formatted = formatted.replace(/\bsqrt\s*\(([^)]+)\)/gi, '\\sqrt{$1}');

    // Exponents: x^2 → x^{2}
    formatted = formatted.replace(/([a-zA-Z])\^([a-zA-Z0-9])/g, '$1^{$2}');

    // Subscripts: x_0 → x_{0}
    formatted = formatted.replace(/([a-zA-Z])_(\d+)/g, '$1_{$2}');

    // Wrap in $$ if contains LaTeX commands
    const hasLatexCommands = /\\(lim|frac|sqrt|sin|cos|tan|ln|log|to|infty|pi|times|div|pm|int|sum|prod)/.test(formatted);
    if (hasLatexCommands && !formatted.includes('$$')) {
      formatted = `$$ ${formatted} $$`;
    }

    return sanitizeLaTeX(formatted);
  };

  /**
   * Handle paste event - auto-format math expressions
   */
  const handlePaste = (e, fieldName) => {
    const pastedText = e.clipboardData.getData('text');

    // Check if pasted text contains math expressions
    const hasMathKeywords = /lim|ln|log|sin|cos|tan|sqrt|∞|π|→|->|frac|int|sum|prod|√|∫|∑|∏|×|÷|±|≤|≥|≠|\^|_\d/.test(pastedText);

    if (hasMathKeywords) {
      e.preventDefault();
      const formatted = formatMathToLatex(pastedText);
      const sanitized = sanitizeLaTeX(formatted);

      setFormData(prev => {
        const currentValue = prev[fieldName] || '';

        if (!currentValue.trim()) {
          return { ...prev, [fieldName]: sanitized };
        }

        let newValue = currentValue;
        if (!currentValue.includes('$$')) {
          newValue = currentValue + (currentValue.trim() ? ' ' : '') + sanitized;
        } else {
          newValue = currentValue + ' ' + sanitized;
        }

        return { ...prev, [fieldName]: sanitizeLaTeX(newValue) };
      });
    }
  };

  const handleImageChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setImages(prev => ({ ...prev, [fieldName]: file }));
    }
  };

  const handleDeleteExistingImage = async (fieldName) => {
    const imageUrl = existingImages[fieldName];
    if (!imageUrl) return;

    // Check if it's a base64 data URL - if so, just remove it from state (no server deletion needed)
    if (imageUrl.startsWith('data:')) {
      setExistingImages(prev => ({ ...prev, [fieldName]: null }));
      return;
    }

    try {
      // Extract filename from URL (e.g., "/uploads/abc123.jpg" -> "abc123.jpg")
      const filename = imageUrl.split('/').pop();
      await uploadAPI.deleteImage(filename);
      setExistingImages(prev => ({ ...prev, [fieldName]: null }));
    } catch (err) {
      console.error('Failed to delete image:', err);
      setError('Failed to delete image. Please try again.');
    }
  };

  const getImagePreviewUrl = (imageFile, existingUrl) => {
    // If it's a new file, create object URL
    if (imageFile && typeof imageFile === 'object') {
      return URL.createObjectURL(imageFile);
    }
    // If it's an existing image, return the full URL or base64
    if (existingUrl) {
      return getImageUrl(existingUrl);
    }
    return null;
  };

  // Convert image file to base64 with compression
  const compressImageToBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Resize to max 800px width
          const maxWidth = 800;
          const scale = Math.min(1, maxWidth / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Compress to 80% quality
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const openEquationEditor = (fieldName) => {
    setEquationTargetField(fieldName);
    setShowEquationEditor(true);
  };

  const handleEquationInsert = (latex, targetField) => {
    setFormData(prev => {
      const currentValue = prev[targetField] || '';
      // Insert LaTeX at cursor position or append
      const newValue = currentValue + (currentValue ? ' ' : '') + latex;
      return {
        ...prev,
        [targetField]: newValue
      };
    });
  };

  const uploadImages = async () => {
    const uploadedUrls = {};
    for (const [key, file] of Object.entries(images)) {
      if (file) {
        // Convert to base64 with compression
        const base64 = await compressImageToBase64(file);
        uploadedUrls[key] = base64;
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate: if question_type is TEXT, question_text is required
    if (formData.question_type === 'TEXT' && !formData.question_text.trim()) {
      setError('Question text is required for text-based questions');
      return;
    }

    // Validate: if question_type is IMAGE, image is required
    if (formData.question_type === 'IMAGE' && !images.image_url && !existingImages.image_url) {
      setError('Question image is required for image-based questions');
      return;
    }

    // Validate: each option must have either text OR image
    const optionFields = ['option_a', 'option_b', 'option_c', 'option_d'];
    for (const field of optionFields) {
      const hasText = formData[field] && formData[field].trim();
      const hasNewImage = images[`${field}_image_url`];
      const hasExistingImage = existingImages[`${field}_image_url`];

      if (!hasText && !hasNewImage && !hasExistingImage) {
        const optionLabel = field.replace('option_', '').toUpperCase();
        setError(`Option ${optionLabel} must have either text or an image`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Upload new images first
      const uploadedImageUrls = await uploadImages();

      // Merge existing images with new uploads
      // Use new image if uploaded, otherwise keep existing image
      const allImages = {
        image_url: uploadedImageUrls.image_url || existingImages.image_url || null,
        option_a_image_url: uploadedImageUrls.option_a_image_url || existingImages.option_a_image_url || null,
        option_b_image_url: uploadedImageUrls.option_b_image_url || existingImages.option_b_image_url || null,
        option_c_image_url: uploadedImageUrls.option_c_image_url || existingImages.option_c_image_url || null,
        option_d_image_url: uploadedImageUrls.option_d_image_url || existingImages.option_d_image_url || null,
        explanation_image_url: uploadedImageUrls.explanation_image_url || existingImages.explanation_image_url || null
      };

      const payload = {
        ...formData,
        ...allImages,
        marks: parseInt(formData.marks),
        negative_marks: parseFloat(formData.negative_marks) || 0
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
          {/* Question Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Type *
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, question_type: 'TEXT', question_text: prev.question_text }))}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  formData.question_type === 'TEXT'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <i className="fas fa-font text-2xl mb-2"></i>
                <div className="font-semibold">Text-Based Question</div>
                <div className="text-xs opacity-75">Type your question using text</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, question_type: 'IMAGE' }))}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  formData.question_type === 'IMAGE'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <i className="fas fa-image text-2xl mb-2"></i>
                <div className="font-semibold">Image-Based Question</div>
                <div className="text-xs opacity-75">Upload an image of the question</div>
              </button>
            </div>
          </div>

          {/* Question Text - Only show for TEXT type */}
          {formData.question_type === 'TEXT' && (
            <div>
              <label htmlFor="question_text" className="block text-sm font-medium text-gray-700 mb-1">
                Question Text *
              </label>
              <div className="relative">
                <textarea
                  id="question_text"
                  name="question_text"
                  value={formData.question_text}
                  onChange={handleChange}
                  onPaste={(e) => handlePaste(e, 'question_text')}
                  required
                  rows={4}
                  className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                  placeholder="Enter your question here... Paste math: lim x→0 (ex-1)/x"
                />
                {/* Insert Equation Button */}
                <button
                  type="button"
                  onClick={() => openEquationEditor('question_text')}
                  className="absolute right-2 top-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-1"
                  title="Insert mathematical equation"
                >
                  <i className="fas fa-square-root-alt"></i>
                  <span className="hidden sm:inline">Insert Equation</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                <i className="fas fa-info-circle mr-1"></i>
                Tip: Paste math like <code className="bg-gray-100 px-1 rounded">lim x→0 (ex-1)/x</code>
              </p>
              
              {/* Live LaTeX Preview */}
              {formData.question_text && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-xs font-semibold text-blue-700 mb-2">
                    <i className="fas fa-eye mr-1"></i>
                    Live Preview (LaTeX Rendering)
                  </label>
                  <div className="bg-white p-4 rounded border border-blue-100">
                    <RichTextRenderer content={formData.question_text} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Question Image Upload - Only show for IMAGE type */}
          {formData.question_type === 'IMAGE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Image *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  id="question_image_input"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, 'image_url')}
                />
                {!images.image_url && !existingImages.image_url ? (
                  <label htmlFor="question_image_input" className="cursor-pointer">
                    <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3 block"></i>
                    <p className="text-gray-600 font-medium">Click to upload question image</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG supported (Max 5MB)</p>
                  </label>
                ) : (
                  <div className="space-y-3">
                    {/* Show existing image or new preview */}
                    {existingImages.image_url && !images.image_url && (
                      <div className="relative inline-block">
                        <img
                          src={getImageUrl(existingImages.image_url)}
                          alt="Current question"
                          className="max-h-64 max-w-full rounded-lg border-2 border-green-300 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingImage('image_url')}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                          title="Delete image"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {images.image_url && (
                      <div className="relative inline-block">
                        <img
                          src={getImagePreviewUrl(images.image_url, existingImages.image_url)}
                          alt="Question preview"
                          className="max-h-64 max-w-full rounded-lg border-2 border-green-300 shadow-md"
                          onLoad={(e) => {
                            if (typeof images.image_url === 'object') {
                              URL.revokeObjectURL(e.target.src);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImages(prev => ({ ...prev, image_url: null }));
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {images.image_url && (
                      <p className="text-green-600 font-medium text-sm">{images.image_url.name}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Answer Options</h3>
              <span className="text-xs text-gray-500 bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded">
                ✓ Click to mark correct answer
              </span>
            </div>

            {[
              { key: 'A', field: 'option_a', label: 'Option A' },
              { key: 'B', field: 'option_b', label: 'Option B' },
              { key: 'C', field: 'option_c', label: 'Option C' },
              { key: 'D', field: 'option_d', label: 'Option D' }
            ].map(({ key, field, label }) => {
              const isCorrect = formData.correct_option === key;
              const hasText = formData[field] && formData[field].trim();
              const hasNewImage = images[`${field}_image_url`];
              const hasExistingImage = existingImages[`${field}_image_url`];
              const hasImage = hasNewImage || hasExistingImage;
              
              return (
                <div key={key}>
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, correct_option: key }))}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-400'
                    }`}>
                      {isCorrect && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {key}
                    </span>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        onPaste={(e) => handlePaste(e, field)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-1.5 pr-16 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500 bg-white"
                        placeholder={`Enter ${label}...`}
                      />
                      {/* Insert Equation Button for Option */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEquationEditor(field);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-all hover:scale-105 shadow-md flex items-center gap-1"
                        title="Insert equation"
                      >
                        <i className="fas fa-square-root-alt text-xs"></i>
                        <span className="hidden lg:inline text-[10px]">Equation</span>
                      </button>
                    </div>
                    <label className="cursor-pointer text-gray-400 hover:text-blue-500 relative" onClick={(e) => e.stopPropagation()}>
                      <i className={`fas fa-image ${hasImage ? 'text-green-500' : ''}`}></i>
                      {hasImage && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, `${field}_image_url`)} />
                    </label>

                    {/* Show which content is present */}
                    <div className="flex-shrink-0 flex gap-1 text-xs">
                      {hasText && !hasImage && (
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Text</span>
                      )}
                      {!hasText && hasImage && (
                        <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Image</span>
                      )}
                      {hasText && hasImage && (
                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Both</span>
                      )}
                    </div>
                  </div>
                  {/* Image preview for option */}
                  {hasImage && (
                    <div className="mt-2 ml-14 mb-2">
                      <div className="relative inline-block">
                        <img
                          src={getImagePreviewUrl(hasNewImage, hasExistingImage)}
                          alt={`Option ${key} preview`}
                          className="h-20 rounded border border-gray-200 shadow-sm"
                          onLoad={(e) => {
                            if (typeof hasNewImage === 'object') {
                              URL.revokeObjectURL(e.target.src);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasNewImage) {
                              setImages(prev => ({ ...prev, [`${field}_image_url`]: null }));
                            } else if (hasExistingImage) {
                              handleDeleteExistingImage(`${field}_image_url`);
                            }
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg text-xs"
                          title="Delete image"
                        >
                          ✕
                        </button>
                      </div>
                      {hasNewImage && (
                        <p className="text-xs text-green-600 mt-1">
                          <i className="fas fa-paperclip"></i> {hasNewImage.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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

          <div className="pt-2">
            <label htmlFor="correct_option" className="block text-sm font-medium text-gray-700 mb-1">
              Correct Answer *
            </label>
            <select
              id="correct_option"
              name="correct_option"
              value={formData.correct_option}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 touch-target"
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </div>

          {/* Explanation */}
          <div>
            <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
              Explanation <span className="text-gray-400 font-normal">(optional — shown after exam)</span>
            </label>
            <div className="relative">
              <textarea
                id="explanation"
                name="explanation"
                value={formData.explanation}
                onChange={handleChange}
                onPaste={(e) => handlePaste(e, 'explanation')}
                rows={2}
                className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Briefly explain why this answer is correct..."
              />
              {/* Insert Equation Button for Explanation */}
              <button
                type="button"
                onClick={() => openEquationEditor('explanation')}
                className="absolute right-2 top-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-1"
                title="Insert mathematical equation"
              >
                <i className="fas fa-square-root-alt"></i>
                <span className="hidden sm:inline">Equation</span>
              </button>
            </div>
            <div className="mt-2 flex items-center gap-4">
              {existingImages.explanation_image_url && !images.explanation_image_url && <a href={getImageUrl(existingImages.explanation_image_url)} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline"><i className="fas fa-external-link-alt"></i> View current</a>}
              <label className="text-xs text-gray-500 font-bold flex items-center gap-1 cursor-pointer hover:text-blue-600">
                <i className="fas fa-image"></i> {existingImages.explanation_image_url ? 'Replace' : 'Attach'} Explanation Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, 'explanation_image_url')}
                />
              </label>
              {images.explanation_image_url && <span className="text-xs text-green-600 font-bold"><i className="fas fa-check-circle"></i> {images.explanation_image_url.name} selected</span>}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 text-lg"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Updating Question...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  <span>Update Question</span>
                </>
              )}
            </button>
            <Link
              to={`/admin/exams/${examId}`}
              className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <i className="fas fa-times"></i>
              <span>Cancel</span>
            </Link>
          </div>
        </form>
      </Card>
        </div>
      </main>

      {/* Math Equation Editor Modal */}
      <MathEquationEditor
        isOpen={showEquationEditor}
        onClose={() => setShowEquationEditor(false)}
        onInsert={handleEquationInsert}
        targetField={equationTargetField}
        initialValue={formData[equationTargetField] || ''}
      />
    </div>
  );
};

export default EditQuestionPage;
