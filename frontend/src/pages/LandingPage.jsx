import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/common/LanguageToggle';
import ContactSection from '../components/ContactSection';
import './LandingPage.css';

const LandingPage = () => {
  const { t, language } = useLanguage();
  const statsRef = useRef(null);
  const animatedRef = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const subjectKeys = ['Physics', 'Chemistry', 'Maths', 'Biology'];

  // Academy Key Metrics Placeholder with translation keys
  const statsData = [
    { num: 500, suffix: '+', labelKey: 'landing.stat1Label' },
    { num: 100, suffix: '%', labelKey: 'landing.stat2Label' },
    { num: 50, suffix: '+', labelKey: 'landing.stat3Label' },
    { num: 1, suffix: 'st', labelKey: 'landing.stat4Label' }
  ];

  const [displayedStats, setDisplayedStats] = useState(
    statsData.map(s => ({ ...s, current: 0 }))
  );

  // Rotate subjects in hero
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubjectIndex((prev) => (prev + 1) % subjectKeys.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [subjectKeys.length]);

  // Animate stats on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          statsData.forEach((stat, idx) => {
            let start = 0;
            const duration = 1600;
            const stepTime = 25;
            const steps = duration / stepTime;
            const increment = stat.num / steps;
            
            const timer = setInterval(() => {
              start += increment;
              if (start >= stat.num) {
                start = stat.num;
                clearInterval(timer);
              }
              setDisplayedStats(prev =>
                prev.map((item, i) => (i === idx ? { ...item, current: Math.floor(start) } : item))
              );
            }, stepTime);
          });
        }
      },
      { threshold: 0.25 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const activeSubjectName = t(`subjects.${subjectKeys[currentSubjectIndex]}`, subjectKeys[currentSubjectIndex]);

  return (
    <div className="landing-page">
      {/* Neo-Brutalist Navigation */}
      <nav className="navbar">
        <div className="container navbar-content">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="logo">
              <div className="logo-badge">
                <i className="fas fa-microscope"></i>
              </div>
              <div className="logo-text-col">
                <span className="logo-title">{t('common.academyName')}</span>
                <span className="logo-sub">{t('common.academyTagline')}</span>
              </div>
            </div>
          </Link>

          <ul className={`nav-links ${mobileMenuOpen ? 'mobile-nav-active' : ''}`}>
            <li><a href="#about" onClick={() => setMobileMenuOpen(false)}>{t('common.navAbout')}</a></li>
            <li><a href="#programs" onClick={() => setMobileMenuOpen(false)}>{t('common.navPrograms')}</a></li>
            <li><a href="#test-series" onClick={() => setMobileMenuOpen(false)}>{t('common.navMockTests')}</a></li>
            <li><a href="#contact" onClick={() => setMobileMenuOpen(false)}>{t('common.navContact')}</a></li>
          </ul>

          <div className="nav-auth">
            {/* Language Switch Button */}
            <LanguageToggle theme="landing" variant="segmented" className="lang-header-switch" />

            <Link to="/login">
              <button className="btn btn-outline">{t('common.loginBtn')}</button>
            </Link>
          </div>

          <div
            className="menu-toggle"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            style={{ cursor: 'pointer' }}
            aria-label="Toggle Navigation"
          >
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </div>
        </div>
      </nav>

      {/* Notice / Announcement Strip */}
      <div className="notice-strip">
        <div className="container notice-flex">
          <span className="notice-tag">{t('landing.noticeTag')}</span>
          <span className="notice-text">
            <strong>{t('landing.noticeText')}</strong>
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <header className="hero" id="about">
        <div className="container hero-content">
          <div className="hero-text">
            <div className="hero-tag-pill">
              <i className="fas fa-award"></i> {t('landing.heroTag')}
            </div>

            <h1 className="hero-title">
              {t('landing.heroTitleLine1')} <br />
              {t('landing.heroTitleLine2')} <span className="hero-highlight">{t('landing.heroHighlight')}</span>.
            </h1>

            <p className="hero-sub">
              {t('landing.heroSub')}
            </p>

            <div className="hero-actions">
              <Link to="/login">
                <button className="btn btn-primary btn-large">
                  <i className="fas fa-pencil-alt"></i> {t('landing.takeMockTest')}
                </button>
              </Link>
              <a href="#programs">
                <button className="btn btn-outline btn-large">
                  {t('landing.explorePrograms')}
                </button>
              </a>
            </div>

            <div className="rotating-subject-badge">
              <span>{t('landing.targetedFocus')}</span>
              <span className="rotating-subject">{activeSubjectName}</span>
              <span>{t('landing.excellence')}</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card-frame">
              <div className="hero-card-header">
                <div className="header-dots">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                  {t('landing.portalVersion')}
                </span>
              </div>
              <div className="hero-card-body">
                <img
                  src="/assets/hero.png"
                  alt="Students Preparing for Exams"
                  className="hero-card-image"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="hero-status-pill">
                  <span>
                    <i className="fas fa-shield-alt" style={{ marginRight: '8px', color: '#B45309' }}></i>
                    {t('landing.aiProtection')}
                  </span>
                  <span style={{ color: '#15803D' }}>● {t('landing.systemActive')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Programs Bento Grid */}
      <section className="section" id="programs">
        <div className="container">
          <div className="section-head">
            <span className="section-badge">{t('landing.offeringsBadge')}</span>
            <h2 className="section-title">{t('landing.offeringsTitle')}</h2>
            <p className="section-sub">
              {t('landing.offeringsSub')}
            </p>
          </div>

          <div className="bento-grid">
            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-atom"></i>
              </div>
              <h3>{t('landing.card1Title')}</h3>
              <p>{t('landing.card1Desc')}</p>
              <div className="bento-footer">
                <span>{t('landing.card1Footer1')}</span>
                <span>{t('landing.card1Footer2')}</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-stethoscope"></i>
              </div>
              <h3>{t('landing.card2Title')}</h3>
              <p>{t('landing.card2Desc')}</p>
              <div className="bento-footer">
                <span>{t('landing.card2Footer1')}</span>
                <span>{t('landing.card2Footer2')}</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-square-root-alt"></i>
              </div>
              <h3>{t('landing.card3Title')}</h3>
              <p>{t('landing.card3Desc')}</p>
              <div className="bento-footer">
                <span>{t('landing.card3Footer1')}</span>
                <span>{t('landing.card3Footer2')}</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-book-reader"></i>
              </div>
              <h3>{t('landing.card4Title')}</h3>
              <p>{t('landing.card4Desc')}</p>
              <div className="bento-footer">
                <span>{t('landing.card4Footer1')}</span>
                <span>{t('landing.card4Footer2')}</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-laptop-code"></i>
              </div>
              <h3>{t('landing.card5Title')}</h3>
              <p>{t('landing.card5Desc')}</p>
              <div className="bento-footer">
                <span>{t('landing.card5Footer1')}</span>
                <span>{t('landing.card5Footer2')}</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-user-friends"></i>
              </div>
              <h3>{t('landing.card6Title')}</h3>
              <p>{t('landing.card6Desc')}</p>
              <div className="bento-footer">
                <span>{t('landing.card6Footer1')}</span>
                <span>{t('landing.card6Footer2')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Online Proctored Tests Highlight */}
      <section className="exams-section" id="test-series">
        <div className="container">
          <div className="section-head">
            <span className="section-badge">{t('landing.mockBadge')}</span>
            <h2 className="section-title">{t('landing.mockTitle')}</h2>
            <p className="section-sub">
              {t('landing.mockSub')}
            </p>
          </div>

          <div className="exam-grid">
            <div className="exam-card">
              <div className="exam-card-badge-row">
                <span className="exam-type-pill">MHT-CET PCM</span>
                <span className="exam-live-indicator">
                  <span className="live-dot"></span> {t('landing.liveTest')}
                </span>
              </div>
              <div className="exam-card-body">
                <h3>{t('landing.mock1Title')}</h3>
                <p>{t('landing.mock1Desc')}</p>
                <div className="exam-meta-tags">
                  <span className="meta-tag"><i className="fas fa-clock"></i> 180 {t('landing.minutes')}</span>
                  <span className="meta-tag"><i className="fas fa-check-circle"></i> 200 {t('landing.marks')}</span>
                  <span className="meta-tag"><i className="fas fa-shield-alt"></i> {t('landing.proctored')}</span>
                </div>
              </div>
              <div className="exam-card-footer">
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>{t('landing.standardPattern')}</span>
                <Link to="/login">
                  <button className="btn btn-navy" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    {t('landing.enterExam')}
                  </button>
                </Link>
              </div>
            </div>

            <div className="exam-card">
              <div className="exam-card-badge-row">
                <span className="exam-type-pill">NEET PCB</span>
                <span className="exam-live-indicator">
                  <span className="live-dot"></span> {t('landing.liveTest')}
                </span>
              </div>
              <div className="exam-card-body">
                <h3>{t('landing.mock2Title')}</h3>
                <p>{t('landing.mock2Desc')}</p>
                <div className="exam-meta-tags">
                  <span className="meta-tag"><i className="fas fa-clock"></i> 90 {t('landing.minutes')}</span>
                  <span className="meta-tag"><i className="fas fa-check-circle"></i> {t('landing.negativeMarking')}</span>
                  <span className="meta-tag"><i className="fas fa-shield-alt"></i> {t('landing.proctored')}</span>
                </div>
              </div>
              <div className="exam-card-footer">
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>{t('landing.ncertAligned')}</span>
                <Link to="/login">
                  <button className="btn btn-navy" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    {t('landing.enterExam')}
                  </button>
                </Link>
              </div>
            </div>

            <div className="exam-card">
              <div className="exam-card-badge-row">
                <span className="exam-type-pill">{t('landing.chapterDrill', 'CHAPTER DRILL')}</span>
                <span className="exam-live-indicator">
                  <span className="live-dot"></span> {t('landing.onDemand')}
                </span>
              </div>
              <div className="exam-card-body">
                <h3>{t('landing.mock3Title')}</h3>
                <p>{t('landing.mock3Desc')}</p>
                <div className="exam-meta-tags">
                  <span className="meta-tag"><i className="fas fa-clock"></i> 60 {t('landing.minutes')}</span>
                  <span className="meta-tag"><i className="fas fa-check-circle"></i> {t('landing.instantAnalytics')}</span>
                  <span className="meta-tag"><i className="fas fa-shield-alt"></i> {t('landing.proctored')}</span>
                </div>
              </div>
              <div className="exam-card-footer">
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>{t('landing.selfPaced')}</span>
                <Link to="/login">
                  <button className="btn btn-navy" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    {t('landing.enterExam')}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Academy Metrics Section */}
      <section className="stats-section" ref={statsRef}>
        <div className="container">
          <div className="stats-grid">
            {displayedStats.map((item, idx) => (
              <div key={idx} className="stats-card">
                <div className="stats-num">
                  {item.current}{item.suffix}
                </div>
                <div className="stats-label">{t(item.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us Section with Direct Spreadsheet Integration */}
      <ContactSection />

      {/* Neo-Brutalist Footer */}
      <footer className="footer-main">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo">
                <div className="logo-badge" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                  <i className="fas fa-microscope"></i>
                </div>
                <span className="logo-title" style={{ fontSize: '1.05rem' }}>{t('common.academyName')}</span>
              </div>
              <p>
                {t('landing.footerDesc')}
              </p>
            </div>

            <div className="footer-col">
              <h4>{t('landing.footerNavTitle')}</h4>
              <ul>
                <li><a href="#about">{t('common.navAbout')}</a></li>
                <li><a href="#programs">{t('common.navPrograms')}</a></li>
                <li><a href="#test-series">{t('common.navMockTests')}</a></li>
                <li><Link to="/login">{t('landing.loginPortal')}</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>{t('landing.footerCurriculumTitle')}</h4>
              <ul>
                <li><a href="#programs">{t('landing.footerCurriculum1', 'MHT-CET (PCM/PCB)')}</a></li>
                <li><a href="#programs">{t('landing.footerCurriculum2', 'NEET Foundation')}</a></li>
                <li><a href="#programs">{t('landing.footerCurriculum3', 'JEE Main Prep')}</a></li>
                <li><a href="#programs">{t('landing.footerCurriculum4', 'State Board HSC')}</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>{t('landing.footerCenterTitle')}</h4>
              <ul>
                <li style={{ color: '#475569', fontSize: '0.92rem' }}>
                  <i className="fas fa-map-pin" style={{ marginRight: '6px', color: '#F59E0B' }}></i>
                  {t('landing.footerLocation')}
                </li>
                <li style={{ color: '#475569', fontSize: '0.92rem' }}>
                  <i className="fas fa-clock" style={{ marginRight: '6px', color: '#F59E0B' }}></i>
                  {t('landing.footerBatchTimings')}
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} {t('landing.academyBannerTitle')}. {t('landing.allRightsReserved')}</span>
            <span>{t('landing.aiProctoredSys')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
