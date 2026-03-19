import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

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
          <ul className="nav-links"></ul>
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
      <header className="hero">
        <div className="container hero-content">
          <div className="hero-text">
            <h1>Best Coaching for <span>MHT CET</span> Success</h1>
            <p>Expert guidance, quality materials, and proctored test series designed specifically for MHT CET aspirants.</p>
            <div className="search-box">
              <input type="text" placeholder="Search MHT CET courses and materials" />
              <button className="btn btn-primary">Search</button>
            </div>
            <div className="hero-stats">
              <strong>500+</strong> Top Ranked Students
            </div>
          </div>
          <div className="hero-image">
            <img src="/assets/hero.png" alt="Students studying" />
          </div>
        </div>
      </header>

      {/* Latest News Section */}
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
                    <h3>Nearly half of 60, IIT teaching positions vacant</h3>
                    <p>Education Ministry reports significant vacancies in central institutions.</p>
                    <a href="#" className="read-more">Read More <i className="fas fa-arrow-right"></i></a>
                  </div>
                </div>
                <div className="news-card">
                  <img src="/assets/news2.png" alt="News 2" />
                  <div className="news-card-content">
                    <h3>CBSE Class 12 Accountancy Analysis</h3>
                    <p>Instructions unclear, exam pattern changed last minute for students.</p>
                    <a href="#" className="read-more">Read More <i className="fas fa-arrow-right"></i></a>
                  </div>
                </div>
                <div className="news-card">
                  <img src="/assets/news1.png" alt="News 3" />
                  <div className="news-card-content">
                    <h3>JEE Advanced 2026: New Syllabus Out</h3>
                    <p>Check the latest updates on the examination pattern and syllabus.</p>
                    <a href="#" className="read-more">Read More <i className="fas fa-arrow-right"></i></a>
                  </div>
                </div>
              </div>
              <button className="carousel-btn next"><i className="fas fa-chevron-right"></i></button>
            </div>
          </div>
        </div>
      </section>

      {/* Course Category Section */}
      <section className="categories container">
        <div className="section-title">
          <h2>Choose a Domain or Course</h2>
          <p>Explore 2200+ Colleges, 22+ Courses & more</p>
        </div>
        <div className="grid category-grid">
          {[
            { icon: 'fas fa-microchip', title: 'Engineering', desc: 'B.E, B.Tech, M.Tech & more specialized fields.' },
            { icon: 'fas fa-user-graduate', title: 'Education', desc: 'B.Ed, M.Ed and professional teaching courses.' },
            { icon: 'fas fa-palette', title: 'Arts', desc: 'B.A, M.A, Design and Creative Arts courses.' },
            { icon: 'fas fa-flask', title: 'Science', desc: 'B.Sc, M.Sc and intensive research domains.' },
            { icon: 'fas fa-briefcase', title: 'Management', desc: 'MBA, BBA and business leadership programs.' },
            { icon: 'fas fa-stethoscope', title: 'Medical', desc: 'MBBS, BDS, Nurse and healthcare courses.' },
            { icon: 'fas fa-balance-scale', title: 'Law', desc: 'LLB, LLM and legal consultancy paths.' },
            { icon: 'fas fa-coins', title: 'Commerce', desc: 'B.Com, M.Com, CA and financial analytics.' }
          ].map((cat, idx) => (
            <div key={idx} className="category-card">
              <div className="icon-box"><i className={cat.icon}></i></div>
              <h3>{cat.title}</h3>
              <p>{cat.desc}</p>
              <button className="btn-text">Explore <i className="fas fa-chevron-right"></i></button>
            </div>
          ))}
        </div>
      </section>

      {/* Education Loan Section */}
      <section className="loan-section">
        <div className="container">
          <h2>Student Education Loan</h2>
          <div className="process-steps">
            {[
              { icon: 'fas fa-file-signature', title: 'Apply' },
              { icon: 'fas fa-check-circle', title: 'Verification' },
              { icon: 'fas fa-thumbs-up', title: 'Approval' },
              { icon: 'fas fa-money-check-alt', title: 'Disbursement' }
            ].map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="step">
                  <div className="step-icon"><i className={step.icon}></i></div>
                  <h4>{step.title}</h4>
                </div>
                {idx < 3 && <div className="step-divider"></div>}
              </React.Fragment>
            ))}
          </div>
          <button className="btn btn-primary btn-large">Apply for Education Loan</button>
        </div>
      </section>

      {/* upcoming Exams section */}
      <section className="upcoming-exams container">
        <h2>Upcoming Exam & Events</h2>
        <div className="exams-list">
          <div className="exam-card">
            <div className="exam-img">
              <img src="https://img.icons8.com/color/144/000000/test.png" alt="Exam" />
            </div>
            <div className="exam-info">
              <h3>JEE Main 2026 Season 1</h3>
              <p>Registration ends soon. Prepare with top mocks.</p>
              <span className="date">Dec 15, 2025</span>
            </div>
            <button className="btn btn-outline">Apply Now</button>
          </div>
          <div className="exam-card">
            <div className="exam-img">
              <img src="https://img.icons8.com/color/144/000000/test-passed.png" alt="Exam" />
            </div>
            <div className="exam-info">
              <h3>CAT Exam Admittance</h3>
              <p>Management entrance results are declared.</p>
              <span className="date">Jan 05, 2026</span>
            </div>
            <button className="btn btn-outline">Apply Now</button>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="statistics container">
        <h2>Our College Search Portal</h2>
        <div className="grid stats-grid">
          {[
            { icon: 'fas fa-university', num: '2266+', label: 'Colleges' },
            { icon: 'fas fa-book-open', num: '2600+', label: 'Courses' },
            { icon: 'fas fa-map-marked-alt', num: '37+', label: 'States' }
          ].map((stat, idx) => (
            <div key={idx} className="stats-card">
              <i className={stat.icon}></i>
              <span className="number">{stat.num}</span>
              <span className="label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-content">
          <div className="footer-about">
            <h3>About Shree Science Academy</h3>
            <p>We help students find the best colleges and courses across the country with detailed analysis and comparisons.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Terms of use</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h4>Contact Us</h4>
            <p><i className="fas fa-envelope"></i> info@shreescience.com</p>
            <p><i className="fas fa-phone"></i> +91 12345 67890</p>
            <p><i className="fas fa-map-marker-alt"></i> Mumbai, India</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Shree Science Academy. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
