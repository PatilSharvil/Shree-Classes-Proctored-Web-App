import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './AdminSidebar.css';

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="admin-sidebar">
      <Link to="/admin" className={`sidebar-item ${isActive('/admin') ? 'active' : ''}`}>
        <i className="fas fa-th-large"></i>
      </Link>
      <Link to="/admin/exams" className={`sidebar-item ${isActive('/admin/exams') || location.pathname.startsWith('/admin/exams/') ? 'active' : ''}`}>
        <i className="fas fa-file-alt"></i>
      </Link>
      <Link to="/admin/analytics" className={`sidebar-item ${isActive('/admin/analytics') ? 'active' : ''}`}>
        <i className="fas fa-chart-pie"></i>
      </Link>
      <Link to="/admin/students" className={`sidebar-item ${isActive('/admin/students') ? 'active' : ''}`}>
        <i className="fas fa-users"></i>
      </Link>
    </aside>
  );
};

export default AdminSidebar;
