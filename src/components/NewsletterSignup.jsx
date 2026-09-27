import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, Settings, Trash2, Check, Sparkles, XCircle, ShieldCheck, UserPlus, Layers } from 'lucide-react';
import api from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuth } from '../context/AuthContext';

export default function NewsletterSignup({ className = '', variant = 'default' }) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [newBindEmail, setNewBindEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [bindedAccounts, setBindedAccounts] = useState([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores email being processed

  // Generate a unique storage key per logged-in user or guest
  const storageKey = `binded_subscribed_accounts_${user?.email || 'guest'}`;

  // 1. On mount or user change, synchronize binded accounts from LocalStorage and backend
  useEffect(() => {
    const fetchBindedAccounts = async () => {
      let saved = [];
      try {
        const local = localStorage.getItem(storageKey);
        if (local) saved = JSON.parse(local);
      } catch (e) {
        console.error('Error reading localStorage:', e);
      }

      // If user is logged in, always verify their own email status first
      const accountsSet = new Set(Array.isArray(saved) ? saved.map(e => e.toLowerCase()) : []);
      
      if (user?.email) {
        try {
          const statusRes = await api.get(`/newsletter/status/${encodeURIComponent(user.email)}`);
          if (statusRes.data && statusRes.data.isSubscribed) {
            accountsSet.add(user.email.toLowerCase());
          }
        } catch (err) {
          console.error('Error checking user email subscription:', err);
        }

        // Fetch binded accounts from backend
        try {
          const bindedRes = await api.get(`/newsletter/binded/${encodeURIComponent(user.email)}`);
          if (bindedRes.data && Array.isArray(bindedRes.data.accounts)) {
            bindedRes.data.accounts.forEach(acc => accountsSet.add(acc.toLowerCase()));
          }
        } catch (err) {
          console.error('Error fetching binded accounts from server:', err);
        }
      }

      const finalList = Array.from(accountsSet);
      setBindedAccounts(finalList);
      localStorage.setItem(storageKey, JSON.stringify(finalList));
      
      if (!email && user?.email) {
        setEmail(user.email);
      }
    };

    fetchBindedAccounts();
  }, [user, storageKey]);

  const updateBindedStorage = (newAccounts) => {
    setBindedAccounts(newAccounts);
    localStorage.setItem(storageKey, JSON.stringify(newAccounts));
  };

  const handleSubscribe = async (e, customEmail = null) => {
    if (e) e.preventDefault();
    const targetEmail = (customEmail || email).trim().toLowerCase();
    if (!targetEmail) return;
    
    setStatus('loading');
    try {
      const res = await api.post('/newsletter/subscribe', { 
        email: targetEmail,
        bindedUserEmail: user?.email ? user.email.toLowerCase() : null
      });
      setStatus('success');
      setMessage(res.data.message || `Successfully subscribed ${targetEmail} to bulletin dispatches!`);
      
      if (!bindedAccounts.includes(targetEmail)) {
        updateBindedStorage([...bindedAccounts, targetEmail]);
      }
      setNewBindEmail('');
    } catch (err) {
      // Even if error is "already subscribed", ensure it is in binded accounts list!
      if (err.response?.data?.error === 'You are already subscribed!') {
        if (!bindedAccounts.includes(targetEmail)) {
          updateBindedStorage([...bindedAccounts, targetEmail]);
        }
        setStatus('success');
        setMessage(`${targetEmail} is active and binded to your accounts!`);
        setNewBindEmail('');
      } else {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Failed to subscribe. Please verify your email.');
      }
    }
  };

  const handleUnsubscribeSpecific = async (targetEmail) => {
    if (!targetEmail) return;
    setActionLoading(targetEmail);
    try {
      await api.post('/newsletter/unsubscribe', { email: targetEmail });
      const updated = bindedAccounts.filter(acc => acc !== targetEmail);
      updateBindedStorage(updated);
      setStatus('success');
      setMessage(`${targetEmail} has been unsubscribed from bulletins.`);
    } catch (err) {
      alert(`Could not unsubscribe ${targetEmail} at this moment.`);
    } finally {
      setActionLoading(null);
    }
  };

  // Render Account-Linked Subscribed Email Manager Dialog
  const renderManageModal = () => {
    if (!showManageModal) return null;
    return (
      <div className="fixed inset-0 z-[160] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
          
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center space-x-2.5">
              <Layers className="w-6 h-6 text-red-600" />
              <h4 className="text-xl font-bold font-serif text-foreground">Binded Subscribed Accounts</h4>
            </div>
            <button 
              onClick={() => setShowManageModal(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              aria-label="Close dialog"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground font-sans leading-relaxed">
            Here are all email addresses and Gmail accounts subscribed and binded under your profile <strong className="text-foreground font-mono">{user?.email || 'Current Session'}</strong>. Click unsubscribe next to any individual account to disconnect it immediately.
          </p>

          {/* List of Binded Accounts */}
          <div className="space-y-3">
            <h5 className="text-xs font-extrabold font-mono uppercase tracking-wider text-muted-foreground">
              Active Binded Email Accounts ({bindedAccounts.length})
            </h5>
            
            {bindedAccounts.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border/80 rounded-xl bg-muted/20">
                <p className="text-xs text-muted-foreground font-sans">No subscribed email accounts found under this profile.</p>
              </div>
            ) : (
              bindedAccounts.map((accEmail) => (
                <div 
                  key={accEmail}
                  className="p-4 rounded-xl border border-border/80 bg-card hover:border-red-500/40 transition-all flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0 font-mono font-bold text-sm">
                      {accEmail[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold font-mono text-foreground truncate">{accEmail}</p>
                      <span className="inline-flex items-center text-[10px] font-mono text-green-600 dark:text-green-400 font-semibold uppercase tracking-wider">
                        ● Active Bulletin Dispatch
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={actionLoading === accEmail}
                    onClick={() => handleUnsubscribeSpecific(accEmail)}
                    className="shrink-0 text-xs font-bold text-red-600 hover:text-white border border-red-600/30 hover:bg-red-600 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 font-mono uppercase tracking-wider shadow-xs disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {actionLoading === accEmail ? 'Removing...' : 'Unsubscribe'}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add another email to bind */}
          <div className="pt-4 border-t border-border/60">
            <label className="block text-xs font-extrabold font-mono uppercase tracking-wider text-foreground mb-2">
              Subscribe & Bind Another Account
            </label>
            <div className="flex gap-2">
              <Input 
                type="email" 
                placeholder="another.account@gmail.com" 
                value={newBindEmail}
                onChange={(e) => setNewBindEmail(e.target.value)}
                className="h-10 text-xs rounded-xl bg-background border-border/80"
              />
              <Button 
                type="button"
                disabled={!newBindEmail || status === 'loading'}
                onClick={() => handleSubscribe(null, newBindEmail)}
                className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl font-mono uppercase tracking-wider shadow-xs shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Account
              </Button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end">
            <Button 
              type="button" 
              onClick={() => setShowManageModal(false)}
              className="bg-muted hover:bg-muted/80 text-foreground font-bold text-xs px-6 h-10 rounded-xl shadow-xs font-mono uppercase tracking-wider"
            >
              Done
            </Button>
          </div>

        </div>
      </div>
    );
  };

  const hasSubscribedAccounts = bindedAccounts.length > 0;

  if (variant === 'sidebar') {
    return (
      <div className={`bg-card rounded-2xl p-5 shadow-sm border border-border/80 w-full max-w-full min-w-0 ${className}`}>
        {renderManageModal()}
        
        <div className="flex items-center space-x-2.5 mb-4 border-b border-border/60 pb-3">
          <span className="w-2.5 h-5 bg-red-600 rounded-sm shrink-0"></span>
          <h3 className="text-base font-black font-serif uppercase tracking-tight text-foreground">
            Newsletter Accounts
          </h3>
        </div>
        
        {hasSubscribedAccounts ? (
          <div className="space-y-3.5">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground font-sans font-medium">Active Subscribed:</span>
                <span className="font-mono font-extrabold text-red-600 dark:text-red-400 bg-red-600/10 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
                  {bindedAccounts.length} {bindedAccounts.length === 1 ? 'Account' : 'Accounts'} Binded
                </span>
              </div>
              
              {/* Show preview of binded emails */}
              <div className="space-y-1 max-h-24 overflow-y-auto pt-1 border-t border-border/40">
                {bindedAccounts.slice(0, 3).map((em) => (
                  <div key={em} className="flex items-center gap-1.5 text-[11px] font-mono text-foreground truncate">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                    <span className="truncate">{em}</span>
                  </div>
                ))}
                {bindedAccounts.length > 3 && (
                  <p className="text-[10px] text-muted-foreground font-mono pl-3">+ {bindedAccounts.length - 3} more binded account(s)</p>
                )}
              </div>
            </div>

            {status === 'success' && message && (
              <div className="text-xs bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 p-2 rounded-lg font-medium text-center">
                {message}
              </div>
            )}
            
            <button
              onClick={() => setShowManageModal(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-md uppercase tracking-wider font-mono"
            >
              <Settings className="w-4 h-4" /> Manage & Unsubscribe
            </button>
          </div>
        ) : (
          <>
            {status === 'success' && (
              <div className="mb-3 text-xs bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 p-2.5 rounded-xl font-medium flex items-center justify-between">
                <span>{message}</span>
                <button onClick={() => setStatus('idle')} className="underline text-[11px] ml-2">Reset</button>
              </div>
            )}
            <form onSubmit={(e) => handleSubscribe(e, email)} className="flex flex-col gap-2.5">
              <input 
                type="email" 
                placeholder="your.gmail@account.com" 
                required 
                className="h-10 w-full bg-background border border-border/80 rounded-xl px-3.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-600 font-sans"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error' || status === 'success') setStatus('idle');
                }}
              />
              <Button type="submit" disabled={status === 'loading'} className="h-10 w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-xs tracking-wider uppercase font-mono">
                {status === 'loading' ? 'Subscribing...' : 'Subscribe Now'}
              </Button>
            </form>
          </>
        )}
        
        {status === 'error' && (
          <div className="flex items-center space-x-1.5 text-red-500 mt-2.5 text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-snug">{message}</span>
          </div>
        )}
      </div>
    );
  }

  // Default Full-width editorial band variant
  return (
    <div className={`bg-gradient-to-r from-card via-card to-muted/30 rounded-2xl p-6 md:p-10 flex flex-col lg:flex-row items-center justify-between border border-border/80 shadow-md relative overflow-hidden w-full max-w-full min-w-0 ${className}`}>
      {renderManageModal()}
      
      {/* Background journalistic accent */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-red-600/5 rounded-full pointer-events-none blur-3xl" />
      
      <div className="mb-6 lg:mb-0 lg:mr-10 text-center lg:text-left flex-1 min-w-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-extrabold uppercase tracking-widest mb-3 font-mono">
          <Sparkles className="w-3.5 h-3.5" /> Institutional Newsroom Bulletin
        </div>
        <h3 className="text-2xl sm:text-3xl font-black font-serif text-foreground tracking-tight leading-tight mb-2">
          Receive Verified Dispatches & Daily Digests
        </h3>
        <p className="text-sm text-muted-foreground font-sans max-w-2xl leading-relaxed">
          Direct from our editorial desk: bind your email accounts to receive early morning briefings, market watch investigations, and developing crisis dispatches.
        </p>
      </div>
      
      <div className="w-full lg:w-auto flex-1 max-w-md shrink-0">
        {hasSubscribedAccounts ? (
          <div className="bg-background border border-border rounded-2xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-red-600" />
                <span className="font-extrabold font-serif text-sm text-foreground">Binded Newsletter Accounts</span>
              </div>
              <span className="text-[10px] font-extrabold font-mono uppercase bg-red-500/10 text-red-600 px-2.5 py-0.5 rounded">
                {bindedAccounts.length} Active
              </span>
            </div>
            
            <div className="space-y-1.5 max-h-20 overflow-y-auto">
              {bindedAccounts.slice(0, 3).map(acc => (
                <p key={acc} className="text-xs text-muted-foreground font-sans flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <strong className="text-foreground font-mono truncate">{acc}</strong>
                </p>
              ))}
              {bindedAccounts.length > 3 && (
                <p className="text-[11px] text-muted-foreground font-mono pl-3.5">+ {bindedAccounts.length - 3} more account(s)</p>
              )}
            </div>

            <button
              onClick={() => setShowManageModal(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-md font-mono uppercase tracking-wider"
            >
              <Settings className="w-4 h-4" /> Manage Accounts & Unsubscribe
            </button>
          </div>
        ) : (
          <>
            {status === 'success' && (
              <div className="mb-4 text-xs bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 p-3.5 rounded-xl font-semibold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{message}</span>
                </div>
                <button onClick={() => setStatus('idle')} className="underline text-[11px] ml-2 shrink-0">Change</button>
              </div>
            )}
            <form onSubmit={(e) => handleSubscribe(e, email)} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="enter.your.gmail@account.com" 
                  required 
                  className="pl-10 h-12 w-full rounded-xl bg-background border-border font-sans text-xs focus:ring-2 focus:ring-red-600"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                />
              </div>
              <Button type="submit" disabled={status === 'loading'} className="h-12 rounded-xl px-7 bg-red-600 hover:bg-red-700 text-white whitespace-nowrap font-extrabold text-xs font-mono uppercase tracking-wider shadow-md">
                {status === 'loading' ? 'Enrolling...' : 'Join Bulletin'}
              </Button>
            </form>
          </>
        )}
        
        {status === 'error' && (
          <div className="flex items-center space-x-1.5 text-red-500 mt-2.5 text-xs font-bold font-sans">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
