import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './LoginPage.css';
import classImg from '../../assets/class_studying.png';

const LoginPage = () => {
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
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
            <Link to="/" className="back-to-home">
              <i className="fas fa-arrow-left"></i>
              Back to Home
            </Link>

            <div className="login-header">
              <h1>Welcome Back!</h1>
              <p>Please login to access your dashboard.</p>
            </div>

            {error && (
              <div className="error-msg">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Right Side - Visual Section */}
          <div className="login-info-section">
            <div className="student-image-container">
              <img
                src={classImg}
                alt="Students Studying in Class"
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



