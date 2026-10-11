import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from '../../components/common/LanguageToggle';
import './LoginPage.css';
import classImg from '../../assets/class_studying.png';

const LoginPage = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Clear any stale auth state before attempting login
      // This prevents conflicts from expired tokens or CSRF mismatches
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('csrf_token');
      // Also clear stale cookies
      document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';

      const response = await login(email, password);
      const user = response.data?.user;

      console.log('[LoginPage] Login successful, user:', user);

      // Redirect based on user role
      setTimeout(() => {
        if (user?.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }, 100);
    } catch (err) {
      console.error('[LoginPage] Login error:', err);
      const message = err.response?.data?.message || t('login.defaultError');
      
      // Provide user-friendly error messages
      if (err.response?.status === 403 && message.includes('CSRF')) {
        setError(t('login.sessionExpired'));
      } else if (err.response?.status === 401) {
        setError(t('login.invalidCredentials'));
      } else if (err.response?.status === 429) {
        setError(t('login.tooManyAttempts'));
      } else if (err.response?.status === 404) {
        setError(t('login.accountNotFound'));
      } else if (err.code === 'ERR_NETWORK') {
        setError(t('login.networkError'));
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-container">
        <div className="login-card">
          {/* Left Side - Form */}
          <div className="login-form-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <Link to="/" className="back-to-home" style={{ marginBottom: 0 }}>
                <i className="fas fa-arrow-left"></i>
                {t('login.backHome')}
              </Link>
              <LanguageToggle theme="light" variant="segmented" />
            </div>

            <div className="login-header">
              <h1>{t('login.welcomeBack')}</h1>
              <p>{t('login.loginSub')}</p>
            </div>

            {error && (
              <div className="error-msg">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">{t('login.emailLabel')}</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('login.emailPlaceholder')}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">{t('login.passwordLabel')}</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder')}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? t('login.signingIn') : t('login.signInBtn')}
              </button>
            </form>
          </div>

          {/* Right Side - Visual Section */}
          <div className="login-info-section">
            <div className="student-image-container">
              <img
                src={classImg}
                alt={t('login.studentsStudyingAlt')}
                className="student-image"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;



