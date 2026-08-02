import React, { useState } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function NewsletterSignup({ className = '', variant = 'default' }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus('loading');
    try {
      const res = await api.post('/newsletter/subscribe', { email });
      setStatus('success');
      setMessage(res.data.message || 'Thanks for subscribing!');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Failed to subscribe. Try again.');
    }
  };

  if (variant === 'sidebar') {
    return (
      <div className={`bg-card rounded-2xl p-6 shadow-sm border border-border ${className}`}>
        <h3 className="text-[17px] font-bold mb-1.5 text-foreground">Newsletter</h3>
        <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
          Subscribe to our digital bulletin for daily stories directly in your inbox.
        </p>
        
        {status === 'success' ? (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-xl border border-green-100 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col gap-3.5">
            <input 
              type="email" 
              placeholder="Enter email address" 
              required 
              className="h-11 w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={status === 'loading'} className="h-11 w-full whitespace-nowrap bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-xl font-medium">
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        )}
        
        {status === 'error' && (
          <div className="flex items-center space-x-1.5 text-red-500 mt-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-primary/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between border border-primary/10 ${className}`}>
      <div className="mb-6 md:mb-0 md:mr-8 text-center md:text-left flex-1">
        <h3 className="text-2xl font-bold font-serif mb-2 text-foreground">Get the Top News Delivered Daily!</h3>
        <p className="text-muted-foreground">Never miss a breaking story. Join thousands of readers getting our daily digest directly in their inbox.</p>
      </div>
      
      <div className="w-full md:w-auto flex-1 max-w-md">
        {status === 'success' ? (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-xl border border-green-100">
            <CheckCircle className="w-6 h-6" />
            <span className="font-medium">{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                type="email" 
                placeholder="newsjunkie@example.com" 
                required 
                className="pl-10 h-12 w-full rounded-xl bg-background"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={status === 'loading'} className="h-12 rounded-xl px-8 whitespace-nowrap">
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        )}
        
        {status === 'error' && (
          <div className="flex items-center space-x-1.5 text-red-500 mt-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
