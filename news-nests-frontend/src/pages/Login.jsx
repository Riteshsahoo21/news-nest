import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const data = await login(email, password);
      const userRoles = data?.user?.roles || (data?.user?.role ? [data.user.role] : []);
      if (userRoles.some(r => ['admin'].includes(r))) {
        navigate('/admin');
      } else {
        navigate('/'); // Redirect to home on success
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Left side: Image/Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
        <img 
          src="/news_dashboard_bg.png" 
          alt="RitzlaNews Editorial Dashboard"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="relative z-20 flex flex-col justify-end p-12 h-full text-white">
          <Link to="/" className="absolute top-12 left-12 flex items-center gap-2 transition-transform hover:scale-105">
            <div className="bg-primary text-white p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
            </div>
            <span className="text-3xl font-bold tracking-tight">News<span className="text-primary">Nest</span></span>
          </Link>
          <div className="max-w-md mb-8">
            <h1 className="text-4xl font-bold font-serif mb-4 leading-tight">Your Daily News, Smartly Sorted.</h1>
            <p className="text-lg text-zinc-300">Access exclusive reporting, personalized live blogs, and real-time news updates directly from our editorial desk.</p>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 bg-slate-50/50 dark:bg-zinc-950 relative">
        <Link to="/" className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <div className="bg-primary text-white p-1.5 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
          </div>
          <span className="text-xl font-bold">News<span className="text-primary">Nest</span></span>
        </Link>

        <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80 dark:border-zinc-800/80 space-y-6 mt-16 lg:mt-0 relative z-10">
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold font-serif tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
            <p className="text-muted-foreground mt-1 text-sm">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 text-center font-medium">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <Input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <a href="#" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
              </div>
              <Input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
              />
            </div>
            
            <Button type="submit" className="w-full h-11 text-base font-semibold shadow-sm hover:shadow-md transition-all rounded-xl mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-zinc-800"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-900 px-4 text-slate-400 dark:text-zinc-500 font-bold tracking-widest">Or continue with</span>
              </div>
            </div>

            <GoogleSignInButton />
          </form>

          <div className="flex flex-col items-center lg:items-start mt-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account? 
              <Link to="/register" className="text-primary font-semibold hover:underline ml-1">
                Create one now
              </Link>
            </p>
            <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1 group">
              Continue without login 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
