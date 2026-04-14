import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const animatedRef = useRef(false);

  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const subjects = ['Physics', 'Chemistry', 'Maths'];

  // Stats data
  const statsData = [
    { icon: 'fas fa-user-graduate', num: '500+', label: 'Students Trained' },
    { icon: 'fas fa-university', num: '150+', label: 'Top Colleges' },
    { icon: 'fas fa-medal', num: '50+', label: 'Top 100 Ranks' }
  ];

  const [displayedStats, setDisplayedStats] = useState(statsData.map(s => ({ ...s, animatedNum: 0 })));

  // Counting animation triggered by IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          animateCounters();
        }
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const animateCounters = () => {
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      setDisplayedStats(
        statsData.map((stat) => {
          const targetNum = parseInt(stat.num.replace('+', ''), 10);
          const currentNum = Math.floor(easedProgress * targetNum);
          return { ...stat, animatedNum: currentNum };
        })
      );

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Set final values
        setDisplayedStats(statsData.map((stat) => ({ ...stat, animatedNum: parseInt(stat.num.replace('+', ''), 10) })));
      }
    };

    requestAnimationFrame(step);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubjectIndex((prevIndex) => (prevIndex + 1) % subjects.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Mobile Menu Toggle logic
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navAuth = document.querySelector('.nav-auth');

    if (menuToggle) {
      const handleToggle = () => {
        navLinks.classList.toggle('active');
        navAuth.classList.toggle('active');
        const icon = menuToggle.querySelector('i');
        if (icon.classList.contains('fa-bars')) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-times');
        } else {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      };
      menuToggle.addEventListener('click', handleToggle);
      return () => menuToggle.removeEventListener('click', handleToggle);
    }
  }, []);

  useEffect(() => {
    // News Carousel logic
    const container = document.querySelector('.news-cards-container');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');

    if (container && prevBtn && nextBtn) {
      const scrollAmount = 375;
      const handleNext = () => container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      const handlePrev = () => container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });

      nextBtn.addEventListener('click', handleNext);
      prevBtn.addEventListener('click', handlePrev);

      const checkScroll = () => {
        if (container.scrollLeft <= 0) {
          prevBtn.style.opacity = '0.3';
          prevBtn.style.pointerEvents = 'none';
        } else {
          prevBtn.style.opacity = '1';
          prevBtn.style.pointerEvents = 'auto';
        }

        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 5) {
          nextBtn.style.opacity = '0.3';
          nextBtn.style.pointerEvents = 'none';
        } else {
          nextBtn.style.opacity = '1';
          nextBtn.style.pointerEvents = 'auto';
        }
      };

      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      checkScroll();

      return () => {
        nextBtn.removeEventListener('click', handleNext);
        prevBtn.removeEventListener('click', handlePrev);
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  useEffect(() => {
    // Reveal on scroll
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.category-card, .stats-card, .exam-card, .cta-card');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-content">
          <div className="logo text-primary-600">
            <i className="fas fa-graduation-cap"></i>
            <span>Shree Science Academy</span>
          </div>
          <ul className="nav-links">
            <li><a href="#home">Home</a></li>
            <li><a href="#courses">Courses</a></li>
            <li><a href="#exams">Online Tests</a></li>
            <li><a href="#results">Results</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <div className="nav-auth">
            <Link to="/login">
              <button className="btn btn-outline">Login</button>
            </Link>
          </div>
          <div className="menu-toggle">
            <i className="fas fa-bars"></i>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero" id="home">
        <div className="container hero-content">
          <div className="hero-text">
            <h1>Best Coaching for <span>MHT CET</span> Success</h1>
            <p>Expert guidance for Class 12th students preparing for MHT CET PCM & PCB. Comprehensive study material, mock tests, and personalized mentorship for engineering & medical aspirants.</p>
            <div className="modern-hero-text">
              <span className="top-label">Smart PCM Practice Platform</span>
              <h2 className="main-heading">
                Boost your <span className="rotating-subject fade-animation" key={currentSubjectIndex}>{subjects[currentSubjectIndex]}</span> score
              </h2>
              <p className="sub-label">Practice smarter. Score higher.</p>
            </div>
          </div>
          <div className="hero-image">
            <img src="/assets/hero.png" alt="Students studying" />
          </div>
        </div>
      </header>

      {/* Latest News Section - CET Updates */}
      <section className="latest-news">
        <div className="news-strip">
          <div className="container">
            <h2>Latest News and Notifications</h2>
            <div className="news-carousel">
              <button className="carousel-btn prev"><i className="fas fa-chevron-left"></i></button>
              <div className="news-cards-container">
                <div className="news-card">
                  <img src="/assets/news1.png" alt="News 1" />
                  <div className="news-card-content">
                    <h3>MHT CET 2026 Registration Opens</h3>
                    <p>State Common Entrance Test Cell announces registration dates for PCM/PCB groups. Apply before deadline.</p>
                  </div>
                </div>
                <div className="news-card">
                  <img src="/assets/news2.png" alt="News 2" />
                  <div className="news-card-content">
                    <h3>MHT CET Syllabus 2026 Released</h3>
                    <p>Complete syllabus for Physics, Chemistry, Mathematics & Biology now available. Download from official website.</p>
                  </div>
                </div>
                <div className="news-card">
                  <img src="/assets/news3.png" alt="News 3" />
                  <div className="news-card-content">
                    <h3>New Batch Starting for Class 12th CET</h3>
                    <p>Join our upcoming batch for MHT CET preparation. Limited seats available. Register now!</p>
                  </div>
                </div>
              </div>
              <button className="carousel-btn next"><i className="fas fa-chevron-right"></i></button>
            </div>
          </div>
        </div>
      </section>

      {/* Course Category Section - CET PCM/PCB Focus */}
      <section className="categories container" id="courses">
        <div className="section-title">
          <h2>Why Choose Us?</h2>
          <p>We provide the best preparation for MHT CET PCM & PCB</p>
        </div>
        <div className="grid category-grid">
          {[
            { icon: 'fas fa-atom', title: 'MHT CET PCM', desc: 'Physics, Chemistry, Mathematics for Engineering aspirants. Complete syllabus coverage.' },
            { icon: 'fas fa-dna', title: 'MHT CET PCB', desc: 'Physics, Chemistry, Biology for Medical aspirants. NEET preparation included.' },
            { icon: 'fas fa-laptop', title: 'Online Mock Tests', desc: 'Full syllabus mock tests with detailed analysis & All India ranking.' },
            { icon: 'fas fa-book-open', title: 'Study Material', desc: 'Chapter-wise notes, formula sheets & practice questions for all subjects.' },
            { icon: 'fas fa-chart-line', title: 'Performance Analysis', desc: 'Track your progress with detailed reports & improvement suggestions.' }
          ].map((cat, idx) => (
            <div key={idx} className="category-card">
              <div className="icon-box"><i className={cat.icon}></i></div>
              <h3>{cat.title}</h3>
              <p>{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Exams Section - CET Focus */}
      <section className="upcoming-exams container" id="exams">
        <h2>Online CET Mock Tests</h2>
        <div className="exams-list">
          <div className="exam-card">
            <div className="exam-img">
              <i className="fas fa-flask"></i>
            </div>
            <div className="exam-info">
              <h3>MHT CET PCM Mock Test</h3>
              <p>Full syllabus mock test for Engineering aspirants. Physics, Chemistry, Mathematics.</p>
              <span className="date">Available 24/7 | 180 Minutes</span>
            </div>
            <Link to="/dashboard">
              <button className="btn btn-outline">Take Test</button>
            </Link>
          </div>
          <div className="exam-card">
            <div className="exam-img">
              <i className="fas fa-clipboard-check"></i>
            </div>
            <div className="exam-info">
              <h3>MHT CET PCB Mock Test</h3>
              <p>Full syllabus mock test for Medical aspirants. Physics, Chemistry, Biology.</p>
              <span className="date">Available 24/7 | 180 Minutes</span>
            </div>
            <Link to="/dashboard">
              <button className="btn btn-outline">Take Test</button>
            </Link>
          </div>
          <div className="exam-card">
            <div className="exam-img">
              <i className="fas fa-book-open"></i>
            </div>
            <div className="exam-info">
              <h3>Chapter-wise Tests</h3>
              <p>Test your knowledge after completing each chapter. Subject-wise tests available.</p>
              <span className="date">Available 24/7 | 45 Minutes</span>
            </div>
            <Link to="/dashboard">
              <button className="btn btn-outline">Take Test</button>
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="statistics" id="results" ref={statsRef}>
        <div className="container">
          <h2>Our Success Record</h2>
          <div className="grid stats-grid">
            {displayedStats.map((stat, idx) => (
              <div key={idx} className="stats-card">
                <i className={stat.icon}></i>
                <span className="number">
                  {stat.animatedNum}{stat.num.includes('+') ? '+' : ''}
                </span>
                <span className="label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Combined Footer Wrapper */}
      <div className="footer-wrapper">
        <div className="container relative-wrapper">
          {/* Overlapped CTA / Newsletter Card */}
          <div className="cta-newsletter-card">
            <div className="cta-left">
              <div className="cta-icon-placeholder">
                  <i className="fas fa-graduation-cap"></i>
              </div>
            </div>
            <div className="cta-right">
              <h2>Start Your CET Preparation Today!</h2>
              <p>Join Shree Science Academy for expert coaching, mock tests, and personalized mentorship.</p>
              <div style={{ marginBottom: '20px' }}>
                  <Link to="/register">
                    <button className="btn-subscribe" style={{ padding: '15px 35px', fontSize: '16px' }}>Get Started</button>
                  </Link>
              </div>
              <p className="cta-policy">Secure your future with the best coaching in Maharashtra.</p>
            </div>
          </div>
        </div>

        <footer className="footer-modern" id="contact">
          <div className="container">
             <div className="footer-grid">
               <div className="footer-brand">
                 <div className="brand-logo text-primary-600">
                   <i className="fas fa-graduation-cap text-primary-600"></i>
                   <span>Shree Science Academy</span>
                 </div>
                 <p className="brand-desc">We are dedicated to providing quality education to Class 12th students preparing for MHT CET PCM & PCB. Our expert faculty, comprehensive study material, and online mock tests ensure complete preparation for engineering & medical entrance exams.</p>
                 <div className="social-icons-modern">
                   <a href="#"><i className="fab fa-facebook-f"></i></a>
                   <a href="#"><i className="fab fa-twitter"></i></a>
                   <a href="#"><i className="fab fa-instagram"></i></a>
                   <a href="#"><i className="fab fa-linkedin-in"></i></a>
                   <a href="#"><i className="fab fa-youtube"></i></a>
                 </div>
               </div>

               <div className="footer-links-col">
                 <h4>Quick Links</h4>
                 <ul>
                   <li><Link to="/">Home</Link></li>
                   <li><Link to="/login">Login</Link></li>
                   <li><Link to="/register">Register</Link></li>
                   <li><Link to="/dashboard">Dashboard</Link></li>
                 </ul>
               </div>

               <div className="footer-links-col">
                 <h4>Our Courses</h4>
                 <ul>
                   <li><a href="#">MHT CET PCM</a></li>
                   <li><a href="#">MHT CET PCB</a></li>
                   <li><a href="#">Mock Test Series</a></li>
                   <li><a href="#">Study Material</a></li>
                 </ul>
               </div>

               <div className="footer-contact-col">
                 <h4>Contact Us</h4>
                 <div className="contact-item">
                   <i className="fas fa-phone"></i>
                   <span>+91 98765 43210</span>
                 </div>
                 <div className="contact-item">
                   <i className="fas fa-envelope"></i>
                   <span>info@shreescienceacademy.com</span>
                 </div>
                 <div className="contact-item">
                   <i className="fas fa-map-marker-alt"></i>
                   <span>Maharashtra, India</span>
                 </div>
               </div>
             </div>
             
             <div className="footer-bottom-bar">
                <p className="copyright">&copy; {new Date().getFullYear()} Shree Science Academy. All rights reserved.</p>
                <div className="bottom-links">
                  <a href="#">Privacy Policy</a>
                  <a href="#">Terms of Use</a>
                  <a href="#">Legal</a>
                  <a href="#">Site Map</a>
                </div>
             </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
