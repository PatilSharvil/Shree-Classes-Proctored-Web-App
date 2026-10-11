import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from '../common/LanguageToggle';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
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
    <header className="bg-[#0f172a] text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold flex items-center gap-2">
          <i className="fas fa-graduation-cap text-2xl text-amber-400"></i>
          <span>{t('common.academyName')}</span>
        </Link>

        <nav className="flex items-center gap-3 md:gap-4">
          <LanguageToggle variant="segmented" className="hidden sm:inline-flex" />
          <LanguageToggle variant="button" className="sm:hidden" />

          {user ? (
            <>
              <button
                onClick={handleDashboardClick}
                className="hover:text-amber-300 touch-target font-medium text-sm transition-colors"
              >
                {t('common.dashboard')}
              </button>
              {/* User Info & Logout */}
              <span className="text-sm text-slate-300 hidden md:inline">
                {user.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm touch-target font-medium transition-colors"
              >
                {t('common.logout')}
              </button>
            </>
          ) : (
            <Link to="/login" className="hover:text-amber-300 touch-target font-medium text-sm transition-colors">
              {t('common.loginBtn')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
