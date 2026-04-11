import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { questionsAPI, uploadAPI } from '../../services/api';
import { sanitizeText } from '../../utils/sanitizer';
import MathEquationEditor from '../../components/ui/MathEquationEditor';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

const AddQuestionPage = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEquationEditor, setShowEquationEditor] = useState(false);
  const [equationTargetField, setEquationTargetField] = useState('question_text');
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [formData, setFormData] = useState({
    question_type: 'TEXT', // 'TEXT' or 'IMAGE'
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const getImagePreviewUrl = (imageFile) => {
    if (!imageFile) return null;
    if (typeof imageFile === 'string') return imageFile; // Already base64
    return URL.createObjectURL(imageFile);
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
    if (formData.question_type === 'IMAGE' && !images.image_url) {
      setError('Question image is required for image-based questions');
      return;
    }

    // Validate: each option must have either text OR image
    const optionFields = ['option_a', 'option_b', 'option_c', 'option_d'];
    for (const field of optionFields) {
      const hasText = formData[field] && formData[field].trim();
      const hasImage = images[`${field}_image_url`];
      
      if (!hasText && !hasImage) {
        const optionLabel = field.replace('option_', '').toUpperCase();
        setError(`Option ${optionLabel} must have either text or an image`);
        return;
      }
    }

    setLoading(true);

    try {
      const uploadedImageUrls = await uploadImages();

      const payload = {
        ...formData,
        ...uploadedImageUrls,
        marks: parseInt(formData.marks),
        negative_marks: parseFloat(formData.negative_marks) || 0
      };

      console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

      await questionsAPI.add(examId, payload);
      navigate(`/admin/exams/${examId}`);
    } catch (err) {
      console.error('❌ Error adding question:', err);
      console.error('Response data:', err.response?.data);
      
      // Get the detailed error message from the backend
      const detailedError = err.response?.data?.error || err.response?.data?.message || 'Failed to add question';
      setError(detailedError);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Please select an Excel file');
      return;
    }

    setImportLoading(true);
    setImportResult(null);

    try {
      const response = await questionsAPI.upload(examId, importFile);
      setImportResult(response.data);
    } catch (err) {
      setImportResult({
        success: false,
        message: err.response?.data?.message || 'Failed to import questions'
      });
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { 
        Question: 'What is 2 + 2?', 
        OptionA: '3', 
        OptionB: '4', 
        OptionC: '5', 
        OptionD: '6', 
        CorrectOption: 'B',
        Marks: 1,
        NegativeMarks: 0,
        Difficulty: 'EASY',
        Explanation: 'Basic arithmetic: 2 + 2 = 4',
        ImageUrl: '',
        OptionAImageUrl: '',
        OptionBImageUrl: '',
        OptionCImageUrl: '',
        OptionDImageUrl: '',
        ExplanationImageUrl: ''
      }
    ];
    
    const csvContent = [
      'Question,OptionA,OptionB,OptionC,OptionD,CorrectOption,Marks,NegativeMarks,Difficulty,Explanation,ImageUrl,OptionAImageUrl,OptionBImageUrl,OptionCImageUrl,OptionDImageUrl,ExplanationImageUrl',
      ...templateData.map(row => 
        `"${row.Question}","${row.OptionA}","${row.OptionB}","${row.OptionC}","${row.OptionD}","${row.CorrectOption}",${row.Marks},${row.NegativeMarks},"${row.Difficulty}","${row.Explanation}","${row.ImageUrl}","${row.OptionAImageUrl}","${row.OptionBImageUrl}","${row.OptionCImageUrl}","${row.OptionDImageUrl}","${row.ExplanationImageUrl}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'questions_template.csv';
    link.click();
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
          <div className="flex-1">
            <h1 className="!m-0 text-2xl font-black text-gray-900">Add Question</h1>
            <p className="!m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Content Creation</p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-6 py-3 bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2"
          >
            <i className="fas fa-file-import"></i> Bulk Import
          </button>
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
                  required
                  rows={4}
                  className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent touch-target"
                  placeholder="Enter your question here... Use $$ for math equations"
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
              {/* Syntax Help */}
              <p className="text-[10px] text-gray-400 mt-2">
                <i className="fas fa-info-circle mr-1"></i>
                Tip: Use <code className="bg-gray-100 px-1 rounded">$$ x^2 $$</code> for inline math equations
              </p>
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
                {!images.image_url ? (
                  <label htmlFor="question_image_input" className="cursor-pointer">
                    <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3 block"></i>
                    <p className="text-gray-600 font-medium">Click to upload question image</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG supported (Max 5MB)</p>
                  </label>
                ) : (
                  <div className="space-y-3">
                    {/* Image Preview */}
                    <div className="relative inline-block">
                      <img
                        src={getImagePreviewUrl(images.image_url)}
                        alt="Question preview"
                        className="max-h-64 max-w-full rounded-lg border-2 border-green-300 shadow-md"
                        onLoad={(e) => {
                          // Clean up the object URL after image loads
                          URL.revokeObjectURL(e.target.src);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setImages(prev => ({ ...prev, image_url: null }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-green-600 font-medium text-sm">{images.image_url.name}</p>
                    <p className="text-xs text-gray-500">{(images.image_url.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
              const hasText = formData[field] && formData[field].trim();
              const hasImage = images[`${field}_image_url`];
              
              return (
                <React.Fragment key={key}>
                  <div
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

                    {/* Text input with equation editor - NOT required if image is present */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-1.5 pr-16 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
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

                    {/* Option Image Upload */}
                    <label className="cursor-pointer text-gray-400 hover:text-blue-500 relative" title="Attach Image">
                      <i className={`fas fa-image ${hasImage ? 'text-green-500' : ''}`}></i>
                      {hasImage && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageChange(e, `${field}_image_url`)}
                      />
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

                    {isCorrect && (
                      <span className="text-xs font-semibold text-green-600 flex-shrink-0">✓ Correct</span>
                    )}
                  </div>
                  {/* Image Preview for Option */}
                  {images[`${field}_image_url`] && (
                    <div className="mt-2 ml-14 mb-2">
                      <div className="relative inline-block">
                        <img
                          src={getImagePreviewUrl(images[`${field}_image_url`])}
                          alt={`Option ${key} preview`}
                          className="h-20 rounded border border-gray-200 shadow-sm"
                          onLoad={(e) => {
                            URL.revokeObjectURL(e.target.src);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setImages(prev => ({ ...prev, [`${field}_image_url`]: null }))}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg text-xs"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        <i className="fas fa-paperclip"></i> {images[`${field}_image_url`].name}
                      </p>
                    </div>
                  )}
                </React.Fragment>
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
            <div className="relative">
              <textarea
                id="explanation"
                name="explanation"
                value={formData.explanation}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            {/* Image Upload for Explanation */}
            <div className="mt-2">
              <label className="text-xs text-gray-500 font-bold flex items-center gap-2 cursor-pointer hover:text-blue-600">
                <i className="fas fa-image"></i> Attach Explanation Image (Optional)
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, 'explanation_image_url')}
                />
              </label>
              {images.explanation_image_url && (
                <div className="mt-2 ml-4">
                  <div className="relative inline-block">
                    <img
                      src={getImagePreviewUrl(images.explanation_image_url)}
                      alt="Explanation preview"
                      className="h-20 rounded border border-gray-200 shadow-sm"
                      onLoad={(e) => {
                        URL.revokeObjectURL(e.target.src);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setImages(prev => ({ ...prev, explanation_image_url: null }))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg text-xs"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-1 ml-0">
                    <i className="fas fa-check-circle"></i> {images.explanation_image_url.name}
                  </p>
                </div>
              )}
            </div>
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

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white">
            <div className="bg-green-600 p-8 text-white relative">
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <h2 className="text-2xl font-black relative z-10">Bulk Import Questions</h2>
              <p className="text-green-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80 relative z-10">Excel File Upload</p>
            </div>
            <form onSubmit={handleImport} className="p-8 space-y-6">
              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-info-circle text-blue-600 text-xl mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900 mb-2">Excel Format Required</p>
                    <p className="text-xs text-blue-700 mb-3">Your Excel file should have these columns: <strong>Question</strong>, <strong>OptionA</strong>, <strong>OptionB</strong>, <strong>OptionC</strong>, <strong>OptionD</strong>, <strong>CorrectOption</strong> (A/B/C/D), <strong>Marks</strong>, <strong>NegativeMarks</strong>, <strong>Difficulty</strong>, <strong>Explanation</strong>, <strong>ImageUrl</strong>, etc.</p>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-2"
                    >
                      <i className="fas fa-download"></i> Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                  Select Excel File (.xlsx, .xls)
                </label>
                <div className="relative">
                  <i className="fas fa-file-excel absolute left-4 top-1/2 -translate-y-1/2 text-green-500 text-lg"></i>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 font-bold text-gray-700 transition-all cursor-pointer"
                  />
                </div>
                {importFile && (
                  <p className="mt-2 text-xs font-bold text-green-600 flex items-center gap-2">
                    <i className="fas fa-check-circle"></i> {importFile.name}
                  </p>
                )}
              </div>

              {/* Import Result */}
              {importResult && (
                <div className={`rounded-2xl p-4 ${importResult.data?.count ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {importResult.data ? (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-green-900">
                        <i className="fas fa-check-circle"></i> Import Completed
                      </p>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-gray-500 font-bold text-xs uppercase">Questions Imported</p>
                        <p className="text-4xl font-black text-green-600">{importResult.data.count}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-red-900">
                      <i className="fas fa-exclamation-circle"></i> {importResult.message}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={importLoading || !importFile}
                  className="flex-1 py-4 bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Importing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload"></i> Import Questions
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportResult(null);
                  }}
                  className="px-6 py-4 bg-gray-100 text-gray-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Math Equation Editor Modal */}
      <MathEquationEditor
        isOpen={showEquationEditor}
        onClose={() => setShowEquationEditor(false)}
        onInsert={handleEquationInsert}
        targetField={equationTargetField}
        initialValue=""
      />
    </div>
  );
};

export default AddQuestionPage;


