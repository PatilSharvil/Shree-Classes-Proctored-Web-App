import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proctoringAPI } from '../../services/api';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminSidebar from '../../components/layout/AdminSidebar';
import './AdminDashboard.css';

/**
 * Evidence Gallery Page
 * Shows AI proctoring snapshots with filtering and details
 */
const EvidenceGalleryPage = () => {
  const { examId } = useParams();
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadEvidence();
  }, [examId, filter]);

  const loadEvidence = async () => {
    try {
      setLoading(true);
      setError('');
      const params = filter !== 'all' ? { detectionType: filter } : {};
      const response = await proctoringAPI.getExamEvidenceGallery(examId, params);
      setEvidence(response.data.data || []);
    } catch (err) {
      console.error('Error loading evidence:', err);
      setError(err.response?.data?.message || 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      LOW: '#3b82f6',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
      CRITICAL: '#dc2626'
    };
    return colors[severity] || '#6b7280';
  };

  const getDetectionIcon = (type) => {
    const icons = {
      NO_FACE: '👤❌',
      MULTIPLE_FACES: '👥',
      LOOKING_AWAY: '👀',
      PHONE_DETECTED: '📱',
      UNAUTHORIZED_MATERIAL: '📚',
      OFF_CENTER: '↔️',
      SUSPICIOUS_HAND: '✋'
    };
    return icons[type] || '⚠️';
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <AdminSidebar />
        <main className="admin-main-content flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main-content">
        <header className="dashboard-header flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={`/admin/exams/${examId}/proctoring`} className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all active:scale-95">
              <i className="fas fa-arrow-left"></i>
            </Link>
            <div>
              <h1 className="!m-0 text-2xl font-black text-gray-900">AI Evidence Gallery</h1>
              <p className="!m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Proctoring Snapshots</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3">
            <i className="fas fa-exclamation-circle text-lg"></i>
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-3 flex-wrap">
          {['all', 'NO_FACE', 'MULTIPLE_FACES', 'LOOKING_AWAY', 'PHONE_DETECTED'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filter === type
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {type === 'all' ? 'All' : getDetectionIcon(type)} {type === 'all' ? `(${evidence.length})` : ''}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {evidence.length === 0 ? (
          <Card className="!rounded-[32px] border-none shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-3xl text-gray-300 mb-4">
              📷
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No AI evidence captured yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {evidence.map((item) => (
              <div
                key={item.snapshot_id}
                onClick={() => setSelectedImage(item)}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl hover:scale-105 transition-all"
              >
                {/* Image */}
                <div className="relative aspect-video bg-gray-900">
                  <img
                    src={item.image_data}
                    alt={`${item.detection_type} evidence`}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-[10px] font-bold">
                    {Math.round(item.confidence * 100)}%
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{getDetectionIcon(item.detection_type)}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                      style={{
                        backgroundColor: getSeverityColor(item.severity) + '20',
                        color: getSeverityColor(item.severity)
                      }}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 font-bold">{item.detection_type}</p>
                  <p className="text-[9px] text-gray-400">{item.student_name || 'Unknown'}</p>
                  <p className="text-[8px] text-gray-300">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Image */}
              <div className="relative aspect-video bg-gray-900">
                <img
                  src={selectedImage.image_data}
                  alt="Evidence"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">{selectedImage.detection_type}</h3>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 font-bold text-xs uppercase">Student</p>
                    <p className="font-bold text-gray-900">{selectedImage.student_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-600">{selectedImage.student_email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-bold text-xs uppercase">Confidence</p>
                    <p className="font-bold text-gray-900">{Math.round(selectedImage.confidence * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-bold text-xs uppercase">Severity</p>
                    <p className="font-bold" style={{ color: getSeverityColor(selectedImage.severity) }}>
                      {selectedImage.severity}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-bold text-xs uppercase">Timestamp</p>
                    <p className="font-bold text-gray-900">{new Date(selectedImage.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                {selectedImage.violation_description && (
                  <div>
                    <p className="text-gray-500 font-bold text-xs uppercase mb-1">Description</p>
                    <p className="text-sm text-gray-700">{selectedImage.violation_description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EvidenceGalleryPage;
