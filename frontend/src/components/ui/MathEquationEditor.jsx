import React, { useEffect, useRef, useState, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * MathEquationEditor - Interactive math equation editor using MathLive
 * Allows admins to create and edit mathematical equations with a visual editor
 * Outputs LaTeX format wrapped in $$ $$ for rendering with KaTeX/MathJax
 */
const MathEquationEditor = ({ 
  initialValue = '', 
  onInsert, 
  isOpen, 
  onClose,
  targetField = 'question_text'
}) => {
  const mathFieldRef = useRef(null);
  const [latex, setLatex] = useState(initialValue.replace(/\$\$/g, '').trim());
  const [previewLatex, setPreviewLatex] = useState('');
  const [mathLiveLoaded, setMathLiveLoaded] = useState(false);
  const [mathLiveElement, setMathLiveElement] = useState(null);
  const debounceTimerRef = useRef(null);

  // Get human-readable field name
  const getFieldDisplayName = () => {
    const fieldMap = {
      'question_text': 'Question Text',
      'option_a': 'Option A',
      'option_b': 'Option B',
      'option_c': 'Option C',
      'option_d': 'Option D',
      'explanation': 'Explanation'
    };
    return fieldMap[targetField] || targetField;
  };

  // Initialize MathLive when modal opens
  useEffect(() => {
    if (isOpen && mathFieldRef.current) {
      // Reset state from initialValue
      const cleanedValue = initialValue.replace(/\$\$/g, '').trim();
      setLatex(cleanedValue);
      setPreviewLatex(cleanedValue);

      // Dynamically load MathLive from CDN
      if (!window.MathfieldElement) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathlive@0.98.5/dist/mathlive.min.js';
        script.onload = () => {
          setMathLiveLoaded(true);
          initializeMathField(cleanedValue);
        };
        script.onerror = () => {
          setMathLiveLoaded(false);
          console.error('[MathEquationEditor] Failed to load MathLive from CDN');
        };
        document.head.appendChild(script);
      } else {
        setMathLiveLoaded(true);
        initializeMathField(cleanedValue);
      }
    }

    return () => {
      // Cleanup on modal close
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Remove MathLive event listener
      if (mathLiveElement) {
        mathLiveElement.removeEventListener('input', handleMathLiveInput);
      }
    };
  }, [isOpen]);

  const initializeMathField = (initialValue = '') => {
    if (!mathFieldRef.current || !window.MathfieldElement) return;

    // Guard against double-initialization
    if (mathFieldRef.current.querySelector('math-field')) {
      return;
    }

    // Clear existing content
    mathFieldRef.current.innerHTML = '';

    // Create MathLive field
    const mf = new window.MathfieldElement();
    mf.setAttribute('virtual-keyboard-mode', 'manual');
    mf.setAttribute('placeholder', 'Type equation here...');

    // Set initial value if provided
    if (initialValue) {
      mf.setValue(initialValue);
    }

    // Listen for input changes
    mf.addEventListener('input', handleMathLiveInput);

    setMathLiveElement(mf);
    mathFieldRef.current.appendChild(mf);
  };

  const handleMathLiveInput = (evt) => {
    const value = evt.target.value;
    setLatex(value);

    // Debounce preview updates (300ms)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setPreviewLatex(value);
    }, 300);
  };

  const insertSymbol = (symbol) => {
    const mathField = mathFieldRef.current?.querySelector('math-field');
    if (mathField) {
      mathField.executeCommand(symbol);
      mathField.focus();
    }
  };

  const insertTemplate = (template) => {
    const mathField = mathFieldRef.current?.querySelector('math-field');
    if (mathField) {
      mathField.insert(template);
      mathField.focus();
    }
  };

  const handleInsert = () => {
    if (!latex.trim()) return;
    
    // Wrap in $$ $$ for display math mode
    const wrappedLatex = `$$ ${latex.trim()} $$`;
    onInsert(wrappedLatex, targetField);
    onClose();
  };

  const handleClear = () => {
    setLatex('');
    setPreviewLatex('');
    const mathField = mathFieldRef.current?.querySelector('math-field');
    if (mathField) {
      mathField.setValue('');
      mathField.focus();
    }
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Quick insert symbols
  const commonSymbols = [
    { label: '∫', value: '\\int ', tooltip: 'Integral' },
    { label: '∫₀¹', value: '\\int_0^1 ', tooltip: 'Definite Integral' },
    { label: 'd/dx', value: '\\frac{d}{dx}', tooltip: 'Derivative' },
    { label: '∂/∂x', value: '\\frac{\\partial}{\\partial x}', tooltip: 'Partial Derivative' },
    { label: 'lim', value: '\\lim_{x \\to } ', tooltip: 'Limit' },
    { label: 'limₓ→₀', value: '\\lim_{x \\to 0} ', tooltip: 'Limit x→0' },
    { label: 'limₓ→∞', value: '\\lim_{x \\to \\infty} ', tooltip: 'Limit x→∞' },
    { label: '∑', value: '\\sum ', tooltip: 'Summation' },
    { label: '∑ᵢ₌₁ⁿ', value: '\\sum_{i=1}^{n} ', tooltip: 'Summation i=1 to n' },
    { label: '∏', value: '\\prod ', tooltip: 'Product' },
    { label: '√', value: '\\sqrt{}', tooltip: 'Square Root' },
    { label: '∛', value: '\\sqrt[3]{}', tooltip: 'Cube Root' },
    { label: '∞', value: '\\infty', tooltip: 'Infinity' },
    { label: '≠', value: '\\neq', tooltip: 'Not Equal' },
    { label: '≤', value: '\\leq', tooltip: 'Less Than or Equal' },
    { label: '≥', value: '\\geq', tooltip: 'Greater Than or Equal' },
    { label: '±', value: '\\pm', tooltip: 'Plus-Minus' },
    { label: 'Δ', value: '\\Delta', tooltip: 'Delta' },
    { label: 'θ', value: '\\theta', tooltip: 'Theta' },
    { label: 'π', value: '\\pi', tooltip: 'Pi' },
    { label: 'α', value: '\\alpha', tooltip: 'Alpha' },
    { label: 'β', value: '\\beta', tooltip: 'Beta' },
    { label: 'γ', value: '\\gamma', tooltip: 'Gamma' },
    { label: '∇', value: '\\nabla', tooltip: 'Nabla/Gradient' },
  ];

  const fractions = [
    { label: 'a/b', value: '\\frac{a}{b}', tooltip: 'Fraction' },
    { label: '½', value: '\\frac{1}{2}', tooltip: 'One Half' },
    { label: '⅓', value: '\\frac{1}{3}', tooltip: 'One Third' },
    { label: '¼', value: '\\frac{1}{4}', tooltip: 'One Quarter' },
  ];

  const superscripts = [
    { label: 'x²', value: 'x^{2}', tooltip: 'Square' },
    { label: 'x³', value: 'x^{3}', tooltip: 'Cube' },
    { label: 'xⁿ', value: 'x^{n}', tooltip: 'Power n' },
    { label: 'eˣ', value: 'e^{x}', tooltip: 'Exponential' },
  ];

  const subscripts = [
    { label: 'x₁', value: 'x_{1}', tooltip: 'Subscript 1' },
    { label: 'x₂', value: 'x_{2}', tooltip: 'Subscript 2' },
    { label: 'xₙ', value: 'x_{n}', tooltip: 'Subscript n' },
    { label: 'aₙ', value: 'a_{n}', tooltip: 'Sequence' },
  ];

  const matrices = [
    { label: '2×2 Matrix', value: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', tooltip: '2x2 Matrix' },
    { label: '3×3 Matrix', value: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', tooltip: '3x3 Matrix' },
    { label: 'Determinant', value: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', tooltip: '2x2 Determinant' },
  ];

  // Helper function to render LaTeX preview using KaTeX
  const renderLatexPreview = (latex) => {
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (error) {
      return (
        <div className="text-red-500 text-sm">
          <i className="fas fa-exclamation-triangle mr-1"></i>
          Error: {error.message || 'Invalid LaTeX syntax'}
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="equation-editor-title"
    >
      <div 
        className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1e293b] px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <div>
            <h2 id="equation-editor-title" className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fas fa-square-root-alt text-blue-500"></i>
              Equation Editor
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Editing: <span className="text-blue-400 font-semibold">{getFieldDisplayName()}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-all hover:scale-110"
            title="Close editor (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Quick Insert Toolbar */}
        <div className="bg-[#1e293b] px-4 py-3 border-b border-gray-700 overflow-y-auto max-h-64">
          {/* Integrals & Calculus */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Calculus & Limits</p>
            <div className="flex flex-wrap gap-2">
              {commonSymbols.map((sym, idx) => (
                <button
                  key={idx}
                  onClick={() => insertTemplate(sym.value)}
                  className="px-3 py-2 bg-[#0f172a] hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 border border-gray-600 hover:border-blue-500"
                  title={sym.tooltip}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fractions */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Fractions</p>
            <div className="flex flex-wrap gap-2">
              {fractions.map((frac, idx) => (
                <button
                  key={idx}
                  onClick={() => insertTemplate(frac.value)}
                  className="px-3 py-2 bg-[#0f172a] hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 border border-gray-600 hover:border-blue-500"
                  title={frac.tooltip}
                >
                  {frac.label}
                </button>
              ))}
            </div>
          </div>

          {/* Powers & Roots */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Powers & Roots</p>
            <div className="flex flex-wrap gap-2">
              {[...superscripts, ...subscripts].map((sup, idx) => (
                <button
                  key={idx}
                  onClick={() => insertTemplate(sup.value)}
                  className="px-3 py-2 bg-[#0f172a] hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 border border-gray-600 hover:border-blue-500"
                  title={sup.tooltip}
                >
                  {sup.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matrices */}
          <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Matrices</p>
            <div className="flex flex-wrap gap-2">
              {matrices.map((mat, idx) => (
                <button
                  key={idx}
                  onClick={() => insertTemplate(mat.value)}
                  className="px-3 py-2 bg-[#0f172a] hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 border border-gray-600 hover:border-blue-500"
                  title={mat.tooltip}
                >
                  {mat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* MathLive Editor */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              <i className="fas fa-edit mr-2"></i>
              Equation Input
            </label>
            {!mathLiveLoaded ? (
              <div className="min-h-[120px] bg-[#1e293b] border-2 border-gray-600 rounded-xl p-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                  <p className="text-gray-400 text-sm">Loading equation editor...</p>
                </div>
              </div>
            ) : (
              <div
                ref={mathFieldRef}
                className="min-h-[120px] bg-[#1e293b] border-2 border-gray-600 rounded-xl p-4 text-white focus:border-blue-500 transition-all"
                style={{
                  '--mathlive-background': '#1e293b',
                  '--mathlive-color': '#ffffff',
                  '--mathlive-accent': '#3b82f6',
                }}
              />
            )}
          </div>

          {/* LaTeX Output */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              <i className="fas fa-code mr-2"></i>
              LaTeX Output
            </label>
            <div className="bg-[#1e293b] border border-gray-600 rounded-xl p-4">
              <code className="text-green-400 text-sm break-all font-mono">
                {latex || 'Equation will appear here...'}
              </code>
            </div>
          </div>

          {/* Preview */}
          {previewLatex && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <i className="fas fa-eye mr-2"></i>
                Preview
              </label>
              <div className="bg-white border-2 border-gray-600 rounded-xl p-6 min-h-[80px] flex items-center justify-center overflow-x-auto">
                <div className="text-black text-lg">
                  {renderLatexPreview(previewLatex)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#1e293b] px-6 py-4 flex items-center justify-between gap-4 border-t border-gray-700">
          <button
            onClick={handleClear}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all hover:scale-105"
          >
            <i className="fas fa-trash mr-2"></i>
            Clear
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all hover:scale-105"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!latex.trim()}
              className={`px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 flex items-center gap-2 ${
                latex.trim()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-check"></i>
              Insert Equation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathEquationEditor;
