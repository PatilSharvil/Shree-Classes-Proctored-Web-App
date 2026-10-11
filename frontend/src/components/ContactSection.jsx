import React, { useState } from 'react';
import './ContactSection.css';

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'Admissions & Courses',
    message: ''
  });

  const [status, setStatus] = useState({
    submitting: false,
    success: false,
    error: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ submitting: true, success: false, error: null });

    const webhookUrl =
      import.meta.env.VITE_SPREADSHEET_URL ||
      import.meta.env.VITE_GOOGLE_SHEET_URL;

    if (!webhookUrl) {
      setStatus({
        submitting: false,
        success: false,
        error:
          'Spreadsheet webhook URL is not configured. Please verify VITE_SPREADSHEET_URL in frontend/.env'
      });
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          category: formData.category,
          message: formData.message,
          timestamp: new Date().toISOString()
        })
      });

      setStatus({ submitting: false, success: true, error: null });
      setFormData({
        name: '',
        email: '',
        phone: '',
        category: 'Admissions & Courses',
        message: ''
      });
    } catch (err) {
      console.error('Contact submission error:', err);
      setStatus({
        submitting: false,
        success: false,
        error: 'Unable to submit your message. Please check your network connection and try again.'
      });
    }
  };

  return (
    <section className="contact-section" id="contact">
      <div className="container contact-container">
        {/* Section Header */}
        <div className="contact-header">
          <div className="contact-header-badge">
            <span className="section-badge">Get In Touch</span>
          </div>
          <h2 className="contact-title">Contact Shree Science Academy</h2>
          <p className="contact-subtitle">
            Have questions about 11th & 12th Science admissions, NEET/JEE coaching, or our proctored mock test series? Reach out to our counselors directly.
          </p>
        </div>

        {/* Content Grid */}
        <div className="contact-grid">
          {/* Left Column: Academy Information */}
          <div className="contact-info-card">
            <div className="contact-info-top">
              <div className="contact-brand-row">
                <div className="contact-badge-icon">
                  <i className="fas fa-microscope"></i>
                </div>
                <div className="contact-brand-text">
                  <h3 className="contact-card-heading">Shree Science Academy</h3>
                  <span className="contact-card-subheading">Bhilawadi Center</span>
                </div>
              </div>

              <p className="contact-card-desc">
                Premier coaching center for MHT-CET, NEET, JEE & Maharashtra State Board Science students with rigorous continuous assessments.
              </p>

              <div className="contact-items-list">
                <div className="contact-item">
                  <div className="contact-item-icon">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div className="contact-item-content">
                    <span className="contact-item-label">Campus Location</span>
                    <p className="contact-item-val">Bhilawadi, Sangli District, Maharashtra - 416303</p>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-item-icon">
                    <i className="fas fa-phone-alt"></i>
                  </div>
                  <div className="contact-item-content">
                    <span className="contact-item-label">Admissions Helpline</span>
                    <p className="contact-item-val">Mon – Sat (8:00 AM – 7:00 PM)</p>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-item-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div className="contact-item-content">
                    <span className="contact-item-label">Email Inquiries</span>
                    <p className="contact-item-val">shreescienceacademy@gmail.com</p>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-item-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="contact-item-content">
                    <span className="contact-item-label">Batch Schedules</span>
                    <p className="contact-item-val">Morning (6:30 AM) & Evening Doubt Sessions</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="contact-features-banner">
              <i className="fas fa-shield-alt"></i>
              <span>Direct Spreadsheet Recorded Inquiries • Fast Response Guaranteed</span>
            </div>
          </div>

          {/* Right Column: Contact Inquiry Form */}
          <div className="contact-form-card">
            <div className="form-card-header">
              <h3 className="form-card-title">Send Us a Query</h3>
              <p className="form-card-desc">
                Please fill in your details below. Your query will be recorded directly into our admission desk.
              </p>
            </div>

            {status.success && (
              <div className="contact-alert contact-alert-success">
                <div className="contact-alert-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="contact-alert-body">
                  <strong>Inquiry Submitted Successfully!</strong>
                  <p>Thank you for reaching out. Our team will review your query and contact you shortly.</p>
                </div>
              </div>
            )}

            {status.error && (
              <div className="contact-alert contact-alert-error">
                <div className="contact-alert-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="contact-alert-body">
                  <strong>Submission Notice</strong>
                  <p>{status.error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contact-name">
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="contact-name"
                    name="name"
                    required
                    placeholder="e.g. Rahul Patil"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-phone">
                    Phone Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="contact-phone"
                    name="phone"
                    required
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit mobile number"
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contact-email">
                    Email Address <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="contact-email"
                    name="email"
                    required
                    placeholder="e.g. rahul@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-category">
                    Inquiry Purpose <span className="required">*</span>
                  </label>
                  <select
                    id="contact-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="Admissions & Courses">Admissions (11th / 12th Science)</option>
                    <option value="MHT-CET / NEET Coaching">MHT-CET / NEET Coaching</option>
                    <option value="Online Proctored Test Series">Online Mock Test Series</option>
                    <option value="Fee Structure & Syllabus">Fee Structure & Syllabus</option>
                    <option value="General Query">General Question</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="contact-message">
                  Your Query / Message <span className="required">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows="4"
                  required
                  placeholder="Tell us what you'd like to know or how we can assist you..."
                  value={formData.message}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div className="form-action-row">
                <button
                  type="submit"
                  className="btn btn-primary contact-submit-btn"
                  disabled={status.submitting}
                >
                  {status.submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Submitting Inquiry...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Submit Inquiry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
