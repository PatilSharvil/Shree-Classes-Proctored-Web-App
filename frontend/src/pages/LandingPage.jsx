import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const statsRef = useRef(null);
  const animatedRef = useRef(false);

  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

  // Academy Key Metrics Placeholder
  const statsData = [
    { num: 500, suffix: '+', label: 'Students Enrolled' },
    { num: 100, suffix: '%', label: 'Rigorous Curriculum' },
    { num: 50, suffix: '+', label: 'Full Proctored Mock Tests' },
    { num: 1, suffix: 'st', label: 'Choice for CET/NEET in Bhilawadi' }
  ];

  const [displayedStats, setDisplayedStats] = useState(
    statsData.map(s => ({ ...s, current: 0 }))
  );

  // Rotate subjects in hero
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubjectIndex((prev) => (prev + 1) % subjects.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [subjects.length]);

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
                <span className="logo-title">SHREE SCIENCE ACADEMY</span>
                <span className="logo-sub">BHILAWADI • EXCELLENCE IN CET & NEET</span>
              </div>
            </div>
          </Link>

          <ul className="nav-links">
            <li><a href="#about">About</a></li>
            <li><a href="#programs">Courses & Programs</a></li>
            <li><a href="#test-series">Test Series</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>

          <div className="nav-auth">
            <Link to="/login">
              <button className="btn btn-outline">Student / Admin Login</button>
            </Link>
          </div>

          <div className="menu-toggle">
            <i className="fas fa-bars"></i>
          </div>
        </div>
      </nav>

      {/* Notice / Announcement Strip */}
      <div className="notice-strip">
        <div className="container notice-flex">
          <span className="notice-tag">Notice</span>
          <span className="notice-text">
            <strong>Admissions & Online Proctored Mock Test Series Open</strong> — Expert Coaching for MHT-CET, NEET & JEE Preparation at Bhilawadi Center.
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <header className="hero" id="about">
        <div className="container hero-content">
          <div className="hero-text">
            <div className="hero-tag-pill">
              <i className="fas fa-award"></i> Premier Science Coaching • Bhilawadi
            </div>

            <h1 className="hero-title">
              Master Science. <br />
              Conquer <span className="hero-highlight">MHT-CET & NEET</span>.
            </h1>

            <p className="hero-sub">
              Empowering science aspirants in Bhilawadi with conceptual clarity, rigorous problem-solving sessions, and state-of-the-art AI-proctored mock test simulations.
            </p>

            <div className="hero-actions">
              <Link to="/login">
                <button className="btn btn-primary btn-large">
                  <i className="fas fa-pencil-alt"></i> Take Mock Test
                </button>
              </Link>
              <a href="#programs">
                <button className="btn btn-outline btn-large">
                  Explore Programs
                </button>
              </a>
            </div>

            <div className="rotating-subject-badge">
              <span>Targeted Focus:</span>
              <span className="rotating-subject">{subjects[currentSubjectIndex]}</span>
              <span>Excellence & Problem Solving</span>
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
                  PROCTORED PORTAL v2.0
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
                    AI Anti-Cheating & Auto Timer
                  </span>
                  <span style={{ color: '#15803D' }}>● SYSTEM ACTIVE</span>
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
            <span className="section-badge">Academic Offerings</span>
            <h2 className="section-title">Coaching Programs at Bhilawadi</h2>
            <p className="section-sub">
              Structured preparation pathways crafted for high performance in entrance exams and board milestones.
            </p>
          </div>

          <div className="bento-grid">
            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-atom"></i>
              </div>
              <h3>MHT-CET (PCM & PCB)</h3>
              <p>
                Targeted preparation for Maharashtra Engineering and Pharmacy admissions. Deep concept reviews, speed-accuracy techniques, and exhaustive chapter-wise question banks.
              </p>
              <div className="bento-footer">
                <span>Class 11 & 12 Batch</span>
                <span>Physics • Chemistry • Maths • Bio</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-stethoscope"></i>
              </div>
              <h3>NEET UG Medical Prep</h3>
              <p>
                In-depth NCERT mastery for Biology, paired with rigorous problem sets in Physics and Chemistry. Designed to build precision and mental stamina for medical entrance.
              </p>
              <div className="bento-footer">
                <span>Medical Entrance</span>
                <span>NCERT Centric Curriculum</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-square-root-alt"></i>
              </div>
              <h3>JEE Main Foundation</h3>
              <p>
                Focus on analytical thinking, multi-concept problems, and competitive problem-solving approaches to build solid foundations for premier engineering institutes.
              </p>
              <div className="bento-footer">
                <span>Engineering Track</span>
                <span>Advanced Problem Solving</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-book-reader"></i>
              </div>
              <h3>Board Excellence (HSC)</h3>
              <p>
                Thorough subjective answer writing practice, laboratory concepts, and theory clarity to ensure top percentile scores in Maharashtra State Board examinations.
              </p>
              <div className="bento-footer">
                <span>Board Prep</span>
                <span>Descriptive Test Series</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-laptop-code"></i>
              </div>
              <h3>Digital Proctored Testing</h3>
              <p>
                Students take regular tests on our web platform with full real-time proctoring, instant score calculation, negative marking simulation, and analytics.
              </p>
              <div className="bento-footer">
                <span>Integrated Tech</span>
                <span>Instant Diagnostic Reports</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <i className="fas fa-user-friends"></i>
              </div>
              <h3>Personal Mentorship</h3>
              <p>
                Regular one-on-one doubt clearing sessions, test score discussions, and individual guidance to keep each student consistent and exam-ready.
              </p>
              <div className="bento-footer">
                <span>Continuous Support</span>
                <span>Doubt Counters</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Online Proctored Tests Highlight */}
      <section className="exams-section" id="test-series">
        <div className="container">
          <div className="section-head">
            <span className="section-badge">Online Testing Engine</span>
            <h2 className="section-title">Available Mock Tests</h2>
            <p className="section-sub">
              Access scheduled assessments and practice papers designed directly on the exact pattern of actual entrance tests.
            </p>
          </div>

          <div className="exam-grid">
            <div className="exam-card">
              <div className="exam-card-badge-row">
                <span className="exam-type-pill">MHT-CET PCM</span>
                <span className="exam-live-indicator">
                  <span className="live-dot"></span> LIVE TEST
                </span>
              </div>
              <div className="exam-card-body">
                <h3>Full Length PCM Mock Exam</h3>
                <p>150 Questions covering Physics, Chemistry, and Mathematics based on the latest Maharashtra CET syllabus.</p>
                <div className="exam-meta-tags">
                  <span className="meta-tag"><i className="fas fa-clock"></i> 180 Minutes</span>
                  <span className="meta-tag"><i className="fas fa-check-circle"></i> 200 Marks</span>
                  <span className="meta-tag"><i className="fas fa-shield-alt"></i> Proctored</span>
                </div>
              </div>
              <div className="exam-card-footer">
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Standard Exam Pattern</span>
                <Link to="/login">
                  <button className="btn btn-navy" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    Enter Exam
                  </button>
                </Link>
              </div>
            </div>

            <div className="exam-card">
              <div className="exam-card-badge-row">
                <span className="exam-type-pill">NEET PCB</span>
                <span className="exam-live-indicator">
                  <span className="live-dot"></span> LIVE TEST
                </span>
              </div>
              <div className="exam-card-body">
                <h3>NEET Biology & Chem Speed Test</h3>
                <p>Chapter-wise high-yield MCQs for rapid recall, negative marking discipline, and NCERT-aligned questions.</p>
                <div className="exam-meta-tags">
                  <span className="meta-tag"><i className="fas fa-clock"></i> 90 Minutes</span>
                  <span className="meta-tag"><i className="fas fa-check-circle"></i> Negative Marking</span>
                  <span className="meta-tag"><i className="fas fa-shield-alt"></i> Proctored</span>
                </div>
              </div>
              <div className="exam-card-footer">
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>NCERT Aligned</span>
                <Link to="/login">
                  <button className="btn btn-navy" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    Enter Exam
                  </button>
                </Link>
              </div>
            </div>

            <div className="exam-card">
              <div className="exam-card-badge-row">
                <span className="exam-type-pill">CHAPTER DRILL</span>
                <span className="exam-live-indicator">
                  <span className="live-dot"></span> ON-DEMAND
                </span>
              </div>
              <div className="exam-card-body">
                <h3>Physics Mechanics & Electrostatics</h3>
                <p>Concept tester to evaluate formula application, problem-solving speed, and numerical accuracy.</p>
                <div className="exam-meta-tags">
                  <span className="meta-tag"><i className="fas fa-clock"></i> 60 Minutes</span>
                  <span className="meta-tag"><i className="fas fa-check-circle"></i> Instant Analytics</span>
                  <span className="meta-tag"><i className="fas fa-shield-alt"></i> Proctored</span>
                </div>
              </div>
              <div className="exam-card-footer">
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Self-paced</span>
                <Link to="/login">
                  <button className="btn btn-navy" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    Enter Exam
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
                <div className="stats-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Academy Info & Contact Banner (Bhilawadi) */}
      <div className="container">
        <div className="academy-info-banner" id="contact">
          <div className="info-banner-grid">
            <div>
              <h2 className="info-banner-title">Shree Science Academy, Bhilawadi</h2>
              <p className="info-banner-sub">
                Committed to delivering disciplined coaching, individual attention, and rigorous evaluation for science students aiming for top engineering and medical colleges.
              </p>
              <ul className="info-features-list">
                <li><i className="fas fa-check-circle"></i> Experienced & dedicated faculty team</li>
                <li><i className="fas fa-check-circle"></i> Regular chapter assessments & progress tracking</li>
                <li><i className="fas fa-check-circle"></i> Proctored digital testing lab environment</li>
              </ul>
            </div>

            <div className="info-box-right">
              <h4>Academy Center Details</h4>
              <div className="location-item">
                <i className="fas fa-map-marker-alt"></i>
                <div>
                  <strong>Location:</strong>
                  <p>Bhilawadi, Sangli District, Maharashtra, India</p>
                </div>
              </div>
              <div className="location-item">
                <i className="fas fa-graduation-cap"></i>
                <div>
                  <strong>Courses:</strong>
                  <p>XI & XII Science • MHT-CET • NEET • JEE</p>
                </div>
              </div>
              <div className="location-item">
                <i className="fas fa-desktop"></i>
                <div>
                  <strong>Examination Portal:</strong>
                  <p>Online & In-Campus Proctored Sessions</p>
                </div>
              </div>
              <Link to="/login" style={{ textDecoration: 'none', display: 'block', marginTop: '16px' }}>
                <button className="btn btn-primary" style={{ width: '100%' }}>
                  Student Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Neo-Brutalist Footer */}
      <footer className="footer-main">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo">
                <div className="logo-badge" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                  <i className="fas fa-microscope"></i>
                </div>
                <span className="logo-title" style={{ fontSize: '1.05rem' }}>SHREE SCIENCE ACADEMY</span>
              </div>
              <p>
                Premier coaching institute located in Bhilawadi dedicated to academic excellence in 11th & 12th Science, MHT-CET, NEET, and JEE.
              </p>
            </div>

            <div className="footer-col">
              <h4>Navigation</h4>
              <ul>
                <li><a href="#about">About Us</a></li>
                <li><a href="#programs">Programs</a></li>
                <li><a href="#test-series">Mock Tests</a></li>
                <li><Link to="/login">Login Portal</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Curriculum</h4>
              <ul>
                <li><a href="#programs">MHT-CET (PCM/PCB)</a></li>
                <li><a href="#programs">NEET Foundation</a></li>
                <li><a href="#programs">JEE Main Prep</a></li>
                <li><a href="#programs">State Board HSC</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Academy Center</h4>
              <ul>
                <li style={{ color: '#475569', fontSize: '0.92rem' }}>
                  <i className="fas fa-map-pin" style={{ marginRight: '6px', color: '#F59E0B' }}></i>
                  Bhilawadi, Sangli, Maharashtra
                </li>
                <li style={{ color: '#475569', fontSize: '0.92rem' }}>
                  <i className="fas fa-clock" style={{ marginRight: '6px', color: '#F59E0B' }}></i>
                  Batch Timings: Morning & Evening
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} Shree Science Academy, Bhilawadi. All rights reserved.</span>
            <span>AI Proctored Examination System</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
