import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './LanguageToggle.css';

const LanguageToggle = ({ variant = 'segmented', theme = 'header', className = '' }) => {
  const { isMarathi, toggleLanguage, setLanguage } = useLanguage();

  if (variant === 'segmented') {
    let containerClass = 'lang-toggle-header';
    let btnClass = 'lang-toggle-header-btn';

    if (theme === 'landing') {
      containerClass = 'lang-toggle-landing';
      btnClass = 'lang-toggle-landing-btn';
    } else if (theme === 'light') {
      containerClass = 'lang-toggle-light';
      btnClass = 'lang-toggle-light-btn';
    }

    return (
      <div
        className={`${containerClass} ${className}`}
        role="group"
        aria-label="Language selection"
      >
        <button
          type="button"
          onClick={() => setLanguage('mr')}
          className={`${btnClass} ${isMarathi ? 'active' : ''}`}
          title="मराठी भाषा निवडा"
          aria-pressed={isMarathi}
        >
          <i className="fas fa-globe text-xs" aria-hidden="true" />
          <span>मराठी</span>
        </button>

        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`${btnClass} ${!isMarathi ? 'active' : ''}`}
          title="Switch to English"
          aria-pressed={!isMarathi}
        >
          <span>English</span>
        </button>
      </div>
    );
  }

  // Single button variant
  let singleBtnClass = 'lang-btn-header';
  if (theme === 'landing') {
    singleBtnClass = 'lang-btn-landing';
  } else if (theme === 'light') {
    singleBtnClass = 'lang-btn-light';
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`${singleBtnClass} ${className}`}
      title={isMarathi ? 'Switch to English' : 'मराठी मध्ये बदला'}
      aria-label="Toggle language"
    >
      <i className="fas fa-language" aria-hidden="true" />
      <span>{isMarathi ? 'English' : 'मराठी'}</span>
    </button>
  );
};

export default LanguageToggle;
