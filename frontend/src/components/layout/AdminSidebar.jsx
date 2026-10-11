import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import './AdminSidebar.css';

const AdminSidebar = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/admin', icon: 'fa-th-large', label: t('admin.dashboard'), exact: true },
    { path: '/admin/exams', icon: 'fa-file-alt', label: t('admin.exams') },
    { path: '/admin/analytics', icon: 'fa-chart-pie', label: t('admin.analytics') },
    { path: '/admin/students', icon: 'fa-users', label: t('admin.students') },
  ];

  const checkActive = (item) => {
    if (item.exact) return isActive(item.path);
    return isActive(item.path) || location.pathname.startsWith(item.path + '/');
  };

  return (
    <>
      {/* Hamburger Toggle — mobile only */}
      <button
        id="admin-sidebar-toggle"
        className="admin-hamburger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'}`} />
      </button>

      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isOpen ? 'mobile-open' : ''}`}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${checkActive(item) ? 'active' : ''}`}
            title={item.label}
            onClick={() => setIsOpen(false)}
          >
            <i className={`fas ${item.icon}`} />
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </aside>
    </>
  );
};

export default AdminSidebar;
