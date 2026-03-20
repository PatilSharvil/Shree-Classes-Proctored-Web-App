import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const Header = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDashboardClick = () => {
    if (user?.role === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className="bg-primary-600 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold flex items-center gap-2">
          <i className="fas fa-graduation-cap text-2xl"></i>
          <span>Shree Science Academy</span>
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <button 
                onClick={handleDashboardClick}
                className="hover:text-primary-100 touch-target"
              >
                Dashboard
              </button>
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="hover:text-primary-100 touch-target">
                  Admin
                </Link>
              )}
              <span className="text-sm text-primary-200 hidden sm:inline">
                {user.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-primary-700 hover:bg-primary-800 px-3 py-1.5 rounded text-sm touch-target"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="hover:text-primary-100 touch-target">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
