import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { FileText, CheckCircle, Clock } from 'lucide-react';

export default function ApplyReporter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [existingApp, setExistingApp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    idType: '',
    bio: ''
  });
  
  const [photo, setPhoto] = useState(null);
  const [idDocument, setIdDocument] = useState(null);

  useEffect(() => {
    // If not logged in, or not premium, redirect
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!user.isPremium) {
      alert("You must be a premium member to apply for a Reporter role.");
      navigate('/profile');
      return;
    }
    
    if (user.roles.includes('reporter')) {
      alert("You are already a reporter!");
      navigate('/reporter/dashboard');
      return;
    }

    const checkExisting = async () => {
      try {
        const res = await api.get('/reporter-applications/my-application');
        if (res.data) {
          setExistingApp(res.data);
        }
      } catch (err) {
        console.error("Error checking application status:", err);
      } finally {
        setLoading(false);
      }
    };
    
    checkExisting();
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (!photo || !idDocument) {
      alert("Please upload both your photo and ID document.");
      setSubmitting(false);
      return;
    }
    
    const submitData = new FormData();
    submitData.append('phoneNumber', formData.phoneNumber);
    submitData.append('dateOfBirth', formData.dateOfBirth);
    submitData.append('gender', formData.gender);
    submitData.append('idType', formData.idType);
    submitData.append('bio', formData.bio);
    submitData.append('photo', photo);
    submitData.append('idDocument', idDocument);

    try {
      const res = await api.post('/reporter-applications/apply', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setExistingApp(res.data.application);
      alert("Application submitted successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporter Application</h1>
            <p className="text-gray-500 text-sm">Join our team of verified journalists</p>
          </div>
        </div>

        {existingApp && existingApp.status === 'pending' ? (
          <div className="text-center py-10">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Application Under Review</h2>
            <p className="text-gray-600 mb-6">
              You have already submitted an application on {new Date(existingApp.createdAt).toLocaleDateString()}. 
              Our team is currently reviewing your details. You will receive a notification once a decision is made.
            </p>
            <Button onClick={() => navigate('/profile')} variant="outline">Return to Profile</Button>
          </div>
        ) : existingApp && existingApp.status === 'approved' ? (
          <div className="text-center py-10">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Application Approved!</h2>
            <p className="text-gray-600 mb-6">
              Congratulations! You are already a reporter.
            </p>
            <Button onClick={() => navigate('/reporter/dashboard')} className="bg-red-600 hover:bg-red-700 text-white">Go to Dashboard</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {existingApp && existingApp.status === 'rejected' && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm mb-6 border border-red-200">
                Your previous application was unfortunately rejected. You may apply again with updated details.
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={user?.fullName || ''} 
                  disabled 
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input 
                  type="tel" 
                  name="phoneNumber"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <input 
                  type="date" 
                  name="dateOfBirth"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-2">
              <h3 className="font-semibold text-gray-800 mb-4">Identity Verification</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passport-size Photo *</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    required
                    onChange={(e) => setPhoto(e.target.files[0])}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recent clear photo showing your face.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Government-Issued ID Type *</label>
                  <select
                    name="idType"
                    required
                    value={formData.idType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                  >
                    <option value="">Select ID Type</option>
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving Licence">Driving Licence</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload ID Document (PDF) *</label>
                  <input 
                    type="file" 
                    accept="application/pdf"
                    required
                    onChange={(e) => setIdDocument(e.target.files[0])}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be a PDF file containing a clear scan of your selected ID.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Why do you want to be a reporter? (Optional)</label>
              <textarea 
                name="bio"
                rows="3"
                placeholder="Briefly describe your journalistic experience or interests..."
                value={formData.bio}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              ></textarea>
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate('/profile')}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
