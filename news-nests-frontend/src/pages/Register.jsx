import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  
  const { register, loginWithGoogle, sendRegistrationOTP } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (formData.password !== formData.confirmPassword) {
        return setError('Passwords do not match');
      }

      if (!captchaToken) {
        return setError('Please complete the CAPTCHA');
      }

      setLoading(true);
      try {
        const { confirmPassword, ...registerData } = formData;
        await sendRegistrationOTP({ ...registerData, captchaToken });
        setStep(2);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      if (!otp) {
        return setError('Please enter the OTP');
      }

      setLoading(true);
      try {
        const { confirmPassword, ...registerData } = formData;
        await register({ ...registerData, otp });
        navigate('/'); // Redirect to home on success
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to verify OTP and register. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const data = await loginWithGoogle();
      const userRoles = data?.user?.roles || (data?.user?.role ? [data.user.role] : []);
      if (userRoles.some(r => ['admin'].includes(r))) {
        navigate('/admin');
      } else {
        navigate('/'); // Redirect to home on success
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Left side: Image/Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
        <img 
          src="/news_dashboard_bg.png" 
          alt="RitzlaNews Editorial Dashboard"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="relative z-20 flex flex-col justify-end p-12 h-full text-white w-full">
          <Link to="/" className="absolute top-12 left-12 flex items-center gap-2 transition-transform hover:scale-105">
            <div className="bg-primary text-white p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
            </div>
            <span className="text-3xl font-bold tracking-tight">News<span className="text-primary">Nest</span></span>
          </Link>
          <div className="max-w-md mb-8">
            <h1 className="text-4xl font-bold font-serif mb-4 leading-tight">Join the Inner Circle.</h1>
            <p className="text-lg text-zinc-300">Set up your profile to personalize your feed, save essential articles, and access our premium investigative reporting.</p>
          </div>
        </div>
      </div>

      {/* Right side: Register Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 bg-slate-50/50 dark:bg-zinc-950 relative min-h-screen">
        <Link to="/" className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <div className="bg-primary text-white p-1.5 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
          </div>
          <span className="text-xl font-bold">News<span className="text-primary">Nest</span></span>
        </Link>

        <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80 dark:border-zinc-800/80 space-y-6 mt-12 lg:mt-0 mb-8 relative z-10">
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold font-serif tracking-tight text-slate-900 dark:text-white">
              {step === 1 ? 'Create an account' : 'Verify Email'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {step === 1 ? 'Enter your details below to sign up' : 'Enter the 6-digit OTP sent to your email'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 text-center font-medium">
                {error}
              </div>
            )}
            
            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                  <Input 
                    type="text" 
                    name="fullName"
                    placeholder="John Doe" 
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="h-11 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                  <Input 
                    type="email" 
                    name="email"
                    placeholder="name@example.com" 
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-11 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mobile Number <span className="text-muted-foreground font-normal">(Optional)</span></label>
                  <Input 
                    type="tel" 
                    name="mobileNumber"
                    placeholder="+1 234 567 8900" 
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    className="h-11 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                    <Input 
                      type="password" 
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="h-11 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm</label>
                    <Input 
                      type="password" 
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="h-11 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-2 pb-4 w-full overflow-hidden">
                  <div className="scale-90 sm:scale-100 origin-center">
                    <ReCAPTCHA
                      sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                      onChange={(token) => setCaptchaToken(token)}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-1.5 pb-4">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">One-Time Password</label>
                <Input 
                  type="text" 
                  name="otp"
                  placeholder="Enter 6-digit OTP" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="h-11 text-center tracking-[0.5em] text-lg font-bold bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl"
                />
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold shadow-sm hover:shadow-md transition-all rounded-xl mt-2" disabled={loading || googleLoading}>
              {loading 
                ? (step === 1 ? 'Sending OTP...' : 'Verifying...') 
                : (step === 1 ? 'Create Account' : 'Verify & Register')}
            </Button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-zinc-800"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-900 px-4 text-slate-400 dark:text-zinc-500 font-bold tracking-widest">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-11 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 font-semibold shadow-sm hover:shadow transition-all rounded-xl" 
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Connecting...' : 'Sign in with Google'}
            </Button>
          </form>

          <div className="flex flex-col items-center lg:items-start mt-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Already have an account? 
              <Link to="/login" className="text-primary font-semibold hover:underline ml-1">
                Sign in
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
