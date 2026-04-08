import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

const StudentManagementPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT'
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await usersAPI.getAll();
      const allUsers = response.data.data || [];
      setStudents(allUsers.filter(u => u.role === 'STUDENT'));
    } catch (err) {
      console.error('Error loading students:', err);
      let errorMessage = 'Failed to load students.';
      if (err.response) {
        errorMessage = err.response.data.message || err.response.data.errors || errorMessage;
      } else if (err.request) {
        errorMessage = 'No response from server. Please check if the backend is running.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.create(formData);
      setShowModal(false);
      setFormData({ name: '', email: '', password: '', role: 'STUDENT' });
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create student');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await usersAPI.delete(id);
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete student');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Please select an Excel file');
      return;
    }

    setImportLoading(true);
    setImportResult(null);

    try {
      const response = await usersAPI.upload(importFile);
      setImportResult(response.data);
      loadStudents();
    } catch (err) {
      setImportResult({
        success: false,
        message: err.response?.data?.message || 'Failed to import students'
      });
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { Name: 'John Doe', Email: 'john@example.com', Password: 'Password1' },
      { Name: 'Jane Smith', Email: 'jane@example.com', Password: 'SecurePass123' }
    ];
    
    // Create CSV for simplicity
    const csvContent = [
      'Name,Email,Password',
      ...templateData.map(row => `${row.Name},${row.Email},${row.Password}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'students_template.csv';
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main-content">
        <header className="dashboard-header flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all active:scale-95">
              <i className="fas fa-arrow-left"></i>
            </Link>
            <div>
              <h1 className="!m-0 text-2xl font-black text-gray-900">Students</h1>
              <p className="!m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Directory Management</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2"
            >
              <i className="fas fa-file-import"></i> Bulk Import
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2"
            >
              <i className="fas fa-plus"></i> Add New Student
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3">
            <i className="fas fa-exclamation-circle text-lg"></i>
            {error}
          </div>
        )}

        {students.length === 0 ? (
          <Card className="!rounded-[32px] border-none shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-3xl text-gray-300 mb-4">
              <i className="fas fa-user-slash"></i>
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No students discovered yet</p>
            <div className="flex gap-4 mt-4">
              <button onClick={() => setShowImportModal(true)} className="text-green-600 font-black text-xs uppercase tracking-widest hover:underline">
                <i className="fas fa-file-import"></i> Bulk Import
              </button>
              <button onClick={() => setShowModal(true)} className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">Register first student</button>
            </div>
          </Card>
        ) : (
          <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-white overflow-hidden w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Candidate Name</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Identity</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration Date</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-blue-50/10 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-500 font-black text-xs uppercase shadow-inner">
                          {student.name ? student.name.charAt(0) : 'S'}
                        </div>
                        <span className="text-sm font-black text-gray-900 capitalize">{student.name || 'Unknown Candidate'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-gray-500">{student.email}</td>
                    <td className="px-8 py-5">
                       <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                         {new Date(student.created_at).toLocaleDateString()}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="w-10 h-10 bg-white border border-gray-100 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center shadow-sm group-hover:scale-110 active:scale-95"
                        title="Delete Student"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Student Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-white">
              <div className="bg-blue-600 p-8 text-white relative">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <h2 className="text-2xl font-black relative z-10">Register Student</h2>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80 relative z-10">Portal Access Creation</p>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Full Name</label>
                    <div className="relative">
                      <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 transition-all"
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Email Address</label>
                    <div className="relative">
                      <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 transition-all"
                        placeholder="student@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Security Password</label>
                    <div className="relative">
                      <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={8}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 transition-all"
                        placeholder="Min. 8 characters with 1 uppercase & 1 number"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"
                  >
                    Confirm & Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-4 bg-gray-100 text-gray-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white">
              <div className="bg-green-600 p-8 text-white relative">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <h2 className="text-2xl font-black relative z-10">Bulk Import Students</h2>
                <p className="text-green-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80 relative z-10">Excel File Upload</p>
              </div>
              <form onSubmit={handleImport} className="p-8 space-y-6">
                {/* Download Template */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-info-circle text-blue-600 text-xl mt-0.5"></i>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-blue-900 mb-2">Excel Format Required</p>
                      <p className="text-xs text-blue-700 mb-3">Your Excel file should have these columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Password</strong></p>
                      <button
                        type="button"
                        onClick={downloadTemplate}
                        className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-2"
                      >
                        <i className="fas fa-download"></i> Download Template
                      </button>
                    </div>
                  </div>
                </div>

                {/* File Input */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                    Select Excel File (.xlsx, .xls)
                  </label>
                  <div className="relative">
                    <i className="fas fa-file-excel absolute left-4 top-1/2 -translate-y-1/2 text-green-500 text-lg"></i>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 font-bold text-gray-700 transition-all cursor-pointer"
                    />
                  </div>
                  {importFile && (
                    <p className="mt-2 text-xs font-bold text-green-600 flex items-center gap-2">
                      <i className="fas fa-check-circle"></i> {importFile.name}
                    </p>
                  )}
                </div>

                {/* Import Result */}
                {importResult && (
                  <div className={`rounded-2xl p-4 ${importResult.success !== false && importResult.data?.success > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    {importResult.data ? (
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-green-900">
                          <i className="fas fa-check-circle"></i> Import Completed
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-white rounded-lg p-2">
                            <p className="text-gray-500 font-bold">Success</p>
                            <p className="text-2xl font-black text-green-600">{importResult.data.success}</p>
                          </div>
                          <div className="bg-white rounded-lg p-2">
                            <p className="text-gray-500 font-bold">Failed</p>
                            <p className="text-2xl font-black text-red-600">{importResult.data.failed}</p>
                          </div>
                        </div>
                        {importResult.data.errors && importResult.data.errors.length > 0 && (
                          <div className="mt-3 max-h-32 overflow-y-auto">
                            {importResult.data.errors.slice(0, 5).map((err, idx) => (
                              <p key={idx} className="text-xs text-red-700 mb-1">
                                <i className="fas fa-exclamation-triangle"></i> {err.email}: {err.error}
                              </p>
                            ))}
                            {importResult.data.errors.length > 5 && (
                              <p className="text-xs text-gray-500 font-bold">...and {importResult.data.errors.length - 5} more errors</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-red-900">
                        <i className="fas fa-exclamation-circle"></i> {importResult.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={importLoading || !importFile}
                    className="flex-1 py-4 bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {importLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Importing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload"></i> Import Students
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                      setImportResult(null);
                    }}
                    className="px-6 py-4 bg-gray-100 text-gray-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentManagementPage;
