import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';

const Layout = ({ children }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className={`flex-1 ${isAdminPage ? "w-full flex" : "max-w-7xl mx-auto px-4 py-6 w-full"}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
