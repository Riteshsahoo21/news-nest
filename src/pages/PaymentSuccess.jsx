import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user, refreshUser } = useAuth();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (sessionId) {
      api.post('/stripe/verify-session', { sessionId })
        .then(async () => {
          if (refreshUser) {
            await refreshUser();
          }
          setVerifying(false);
          // Briefly wait, then reload window to update auth state
          setTimeout(() => {
            window.location.href = '/subscriptions';
          }, 3000);
        })
        .catch((err) => {
          console.error('Failed to verify session', err);
          setVerifying(false);
        });
    } else {
      setVerifying(false);
    }
  }, [sessionId]);
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-8">
          {verifying 
            ? "Verifying your payment, please wait..." 
            : `Thank you for subscribing, ${user?.fullName || 'User'}! Your premium features are now active. Redirecting...`}
        </p>
        
        <div className="space-y-3">
          <Link to="/profile">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={verifying}>
              Go to Profile
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="w-full">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
