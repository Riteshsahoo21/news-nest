import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { UserPlus, Wand2, Upload, FileText, ImageIcon, ArrowLeft } from 'lucide-react';

export default function AddEditor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Basic Info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Demographic Info
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  
  // Location Info
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  
  // Emergency Contact & Socials
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  
  // Documents
  const [idType, setIdType] = useState('Aadhaar Card');
  const [photo, setPhoto] = useState(null);
  const [idDocument, setIdDocument] = useState(null);

  const generateCredentials = () => {
    const randomString = Math.random().toString(36).substring(2, 8);
    setEmail(`editor_${randomString}@newsnests.com`);
    
    // Generate a secure password: 12 chars, letters, numbers, symbols
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let genPassword = "";
    for (let i = 0; i < 12; i++) {
      genPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(genPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!photo || !idDocument) {
      setError('Both photo and ID Document are required.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('phoneNumber', phoneNumber);
      formData.append('dateOfBirth', dateOfBirth);
      formData.append('gender', gender);
      formData.append('idType', idType);
      
      // New extended fields
      formData.append('addressLine1', addressLine1);
      formData.append('addressLine2', addressLine2);
      formData.append('city', city);
      formData.append('state', state);
      formData.append('zipCode', zipCode);
      formData.append('country', country);
      formData.append('emergencyContactName', emergencyContactName);
      formData.append('emergencyContactPhone', emergencyContactPhone);
      formData.append('linkedInUrl', linkedInUrl);
      formData.append('twitterUrl', twitterUrl);

      formData.append('photo', photo);
      formData.append('idDocument', idDocument);

      await api.post('/users/add-editor', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(`Editor successfully added! \n\nCredentials to share:\nEmail: ${email}\nPassword: ${password}`);
      navigate('/admin/users');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to add editor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/users')}
            className="text-gray-500 hover:text-gray-900 mb-2 px-0 h-auto font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Users
          </Button>
          <h1 className="text-3xl font-bold font-serif text-gray-900 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-red-600" />
            Onboard New Editor
          </h1>
          <p className="text-gray-500 mt-2">
            Create a new editor account and collect their required legal identity documents.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-200 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Credentials Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Wand2 className="w-4 h-4" />
              </div>
              Login Credentials
            </h2>
            <Button type="button" variant="outline" onClick={generateCredentials} className="text-xs h-9 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
              <Wand2 className="w-3 h-3 mr-2" /> Auto-Generate
            </Button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Full Name *</label>
              <Input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Sarah Connor" className="bg-gray-50/50 focus:bg-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email Address *</label>
              <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@newsnests.com" className="bg-gray-50/50 focus:bg-white" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Temporary Password *</label>
              <Input required type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Will be shared with the editor" className="bg-gray-50/50 focus:bg-white font-mono" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Info Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                Personal Details
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Phone Number *</label>
                  <Input required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+91 9876543210" className="bg-gray-50/50 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Date of Birth *</label>
                  <Input required type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="bg-gray-50/50 focus:bg-white" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Gender *</label>
                <select 
                  required
                  value={gender} 
                  onChange={e => setGender(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Address Line 1 *</label>
                  <Input required value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="Street address" className="bg-gray-50/50 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Address Line 2 (Optional)</label>
                  <Input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Apartment, suite, etc." className="bg-gray-50/50 focus:bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">City *</label>
                    <Input required value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="bg-gray-50/50 focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">State *</label>
                    <Input required value={state} onChange={e => setState(e.target.value)} placeholder="State" className="bg-gray-50/50 focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Zip Code *</label>
                    <Input required value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="Postal code" className="bg-gray-50/50 focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Country *</label>
                    <Input required value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className="bg-gray-50/50 focus:bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Socials & Identity */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  Contacts & Profiles
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Emergency Contact *</label>
                    <Input required value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} placeholder="Name" className="bg-gray-50/50 focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Emergency Phone *</label>
                    <Input required value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value)} placeholder="Phone" className="bg-gray-50/50 focus:bg-white" />
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-sm font-semibold text-gray-700">LinkedIn URL</label>
                  <Input value={linkedInUrl} onChange={e => setLinkedInUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className="bg-gray-50/50 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Twitter URL</label>
                  <Input value={twitterUrl} onChange={e => setTwitterUrl(e.target.value)} placeholder="https://twitter.com/..." className="bg-gray-50/50 focus:bg-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
              <div className="bg-red-50/30 px-6 py-4 border-b border-red-50">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  Identity Verification
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-gray-400" /> Passport-size Photo *
                  </label>
                  <Input 
                    required 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setPhoto(e.target.files[0])} 
                    className="bg-white file:bg-red-50 file:text-red-700 file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-red-100 cursor-pointer"
                  />
                  <p className="text-xs text-gray-500">Must be a clear, recent photograph.</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">ID Type *</label>
                    <select 
                      required
                      value={idType} 
                      onChange={e => setIdType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving Licence">Driving Licence</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" /> ID Document (PDF) *
                    </label>
                    <Input 
                      required 
                      type="file" 
                      accept="application/pdf" 
                      onChange={e => setIdDocument(e.target.files[0])} 
                      className="bg-white file:bg-red-50 file:text-red-700 file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-red-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 flex justify-end">
          <Button type="submit" className="w-full sm:w-auto px-8 py-6 text-lg bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20" disabled={loading}>
            {loading ? 'Creating Account...' : 'Add Editor to System'}
          </Button>
        </div>
      </form>
    </div>
  );
}
