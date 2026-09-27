import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { FileText, CheckCircle, XCircle, ExternalLink, User as UserIcon } from 'lucide-react';

export default function ReporterApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/reporter-applications/admin/all');
      setApplications(res.data);
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const getDocumentUrl = (url) => {
    if (url && url.includes('/image/upload/') && url.toLowerCase().endsWith('.pdf')) {
      // Cloudinary blocks direct delivery of .pdf from image/upload/ due to security policies.
      // We gracefully downgrade to .jpg to show the first page for old applications.
      // New applications will use /raw/upload/ and won't hit this block.
      return url.replace(/\.pdf$/i, '.jpg');
    }
    return url;
  };

  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this application?`)) return;
    
    try {
      await api.put(`/reporter-applications/admin/${id}/status`, { status });
      fetchApplications();
    } catch (err) {
      alert("Failed to update application status");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading applications...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
          <FileText className="w-5 h-5 text-red-600" />
          Reporter Applications
        </h2>
        <p className="text-sm text-gray-500 mt-1">Review and approve requests from users to become reporters.</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
            <tr>
              <th className="px-6 py-4 font-semibold">User Info</th>
              <th className="px-6 py-4 font-semibold">Contact & Demographics</th>
              <th className="px-6 py-4 font-semibold">Identity Documents</th>
              <th className="px-6 py-4 font-semibold">Date Applied</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applications.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No applications found.</td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {app.photoUrl ? (
                        <img src={app.photoUrl} alt="Applicant" className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{app.userId?.fullName || 'Unknown User'}</div>
                        <div className="text-gray-500 text-xs">{app.userId?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{app.phoneNumber}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      {app.gender} • {new Date(app.dateOfBirth).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 mb-1">{app.idType}</div>
                    <a 
                      href={getDocumentUrl(app.idDocumentUrl)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View PDF <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      app.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {app.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          onClick={() => handleUpdateStatus(app._id, 'approved')}
                          className="bg-green-100 text-green-700 hover:bg-green-200 border-0 h-8 px-3 text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button 
                          onClick={() => handleUpdateStatus(app._id, 'rejected')}
                          className="bg-red-100 text-red-700 hover:bg-red-200 border-0 h-8 px-3 text-xs"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
