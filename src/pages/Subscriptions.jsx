import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Check, ArrowRight, Star, AlertTriangle, Receipt, Sparkles, Shield, Zap } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Subscriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/subscriptions/plans');
        setPlans(res.data.filter(p => p.isActive));
      } catch (err) {
        console.error('Error fetching plans', err);
      }
    };

    const fetchInvoices = async () => {
      if (user) {
        try {
          const res = await api.get('/user/invoices');
          setInvoices(res.data);
        } catch (err) {
          console.error('Failed to fetch invoices', err);
        }
      }
    };

    Promise.all([fetchPlans(), fetchInvoices()]).finally(() => setLoading(false));
  }, [user]);

  const handleSubscribe = async (planId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setProcessingId(planId);
    try {
      const res = await api.post('/stripe/create-checkout-session', { planId });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to initiate checkout. Please try again later.');
      setProcessingId(null);
    }
  };

  const handleCancelRenewal = async () => {
    try {
      const res = await api.post('/user/cancel-premium');
      alert(res.data.message || "Subscription cancelled. Premium features have been revoked.");
      setShowCancelModal(false);
      // Force a full reload so the AuthContext completely updates and strips access
      window.location.reload();
    } catch (err) {
      alert("Failed to cancel subscription");
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading subscription portal...</div>;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-transparent -z-10"></div>
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute top-60 -left-20 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-6xl mx-auto px-4 py-16 space-y-20">
        
        {/* Available Plans Section */}
        <section className="relative">
          <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-6">
              <Star className="w-4 h-4" />
              Unlock Premium Content
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Choose your perfect plan
            </h1>
            <p className="text-lg text-slate-600 md:text-xl leading-relaxed">
              Experience journalism without limits. Get exclusive insights, ad-free reading, and premium features designed for our most dedicated readers.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200">
              No active subscription plans available at the moment. Please check back later!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch justify-center relative z-10">
              {plans.map((plan, index) => {
                const isPopular = plan.duration === 'yearly' || index === 1; // Highlight logic
                const isActivePlan = user?.isPremium && user?.subscriptionPlanId === plan._id;
                
                return (
                  <div 
                    key={plan._id} 
                    className={`relative group bg-white/80 backdrop-blur-xl rounded-[2rem] transition-all duration-500 flex flex-col h-full 
                      ${isPopular ? 'shadow-2xl shadow-primary/20 border-2 border-primary scale-105 z-10' : 'shadow-xl shadow-slate-200/50 border border-slate-200 hover:-translate-y-2'}
                      ${isActivePlan ? 'ring-4 ring-green-500/50 border-green-500' : ''}
                    `}
                  >
                    {isPopular && !isActivePlan && (
                      <div className="absolute -top-5 left-0 right-0 flex justify-center">
                        <span className="bg-gradient-to-r from-primary to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                          Most Popular
                        </span>
                      </div>
                    )}
                    {isActivePlan && (
                      <div className="absolute -top-5 left-0 right-0 flex justify-center">
                        <span className="bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
                          <Check className="w-3 h-3" /> Current Plan
                        </span>
                      </div>
                    )}

                    <div className="p-8 md:p-10 flex-1">
                      <h3 className="text-2xl font-bold text-slate-900 capitalize mb-3">{plan.name}</h3>
                      <p className="text-slate-500 text-sm min-h-[48px] leading-relaxed">{plan.description}</p>
                      
                      <div className="mt-8 mb-8 flex items-end gap-2 border-b border-slate-100 pb-8">
                        <span className="text-5xl font-extrabold text-slate-900 tracking-tight">₹{plan.price}</span>
                        <span className="text-lg font-medium text-slate-500 mb-2">
                          /{plan.duration === 'yearly' ? 'year' : plan.duration === '6_months' ? '6 months' : 'mo'}
                        </span>
                      </div>

                      <ul className="space-y-4 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className={`mt-1 shrink-0 p-1 rounded-full ${isPopular ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'}`}>
                              <Check className="h-3 w-3" />
                            </div>
                            <span className="text-slate-700 leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-8 pt-0 mt-auto">
                      {isActivePlan && !user?.cancelAtPeriodEnd ? (
                        <Button className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 cursor-default rounded-2xl h-14 font-semibold text-lg" disabled>
                          Active Subscription
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleSubscribe(plan._id)} 
                          disabled={processingId !== null}
                          className={`w-full rounded-2xl h-14 font-semibold text-lg transition-all duration-300 group
                            ${isActivePlan && user?.cancelAtPeriodEnd ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25' : 
                              isPopular 
                                ? 'bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 text-white shadow-lg shadow-primary/25' 
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20'
                            }
                          `}
                        >
                          {processingId === plan._id ? (
                            <span className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing
                            </span>
                          ) : (isActivePlan && user?.cancelAtPeriodEnd) || (invoices.length > 0 && !user?.isPremium) ? (
                            'Renew Subscription'
                          ) : (
                            <span className="flex items-center justify-center">
                              Subscribe Now 
                              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Current Status Section */}
        {user && (
          <section className="relative z-10">
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] p-8 md:p-10 shadow-xl shadow-slate-200/50">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                  <Star className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Your Subscription Status</h2>
              </div>
              
              {user.isPremium ? (
                 <div className={`relative overflow-hidden border p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors
                    ${user.cancelAtPeriodEnd ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'}
                 `}>
                    <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-50 
                      ${user.cancelAtPeriodEnd ? 'bg-orange-400/20' : 'bg-emerald-400/20'}
                    `}></div>

                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 mb-4 shadow-sm">
                        {user.cancelAtPeriodEnd ? <AlertTriangle className="w-4 h-4 text-orange-600" /> : <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />}
                        <span className={`text-sm font-bold uppercase tracking-wider ${user.cancelAtPeriodEnd ? 'text-orange-700' : 'text-emerald-700'}`}>
                          {user.cancelAtPeriodEnd ? 'Pending Expiry' : 'Active Premium'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {user.cancelAtPeriodEnd ? 'Your subscription has been cancelled' : 'You are a Premium Member'}
                      </h3>
                      <p className="text-slate-600 max-w-xl">
                        {user.cancelAtPeriodEnd 
                          ? "You will retain access to premium features until the end of your billing cycle. After that, your account will downgrade to a free tier."
                          : "Thank you for supporting us. You currently have full access to all premium features, ad-free reading, and exclusive content."}
                      </p>
                      
                      {user.daysRemaining !== null && user.daysRemaining !== undefined && (
                        <div className="mt-6 flex items-center gap-3">
                          <span className={`font-mono font-bold text-2xl ${user.cancelAtPeriodEnd ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {user.daysRemaining}
                          </span>
                          <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Days Remaining</span>
                        </div>
                      )}
                    </div>
                    
                    {!user.cancelAtPeriodEnd && (
                      <div className="relative z-10 shrink-0">
                        <Button 
                          variant="outline" 
                          className="bg-white/50 backdrop-blur-sm border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl h-12 px-6"
                          onClick={() => setShowCancelModal(true)}
                        >
                          Cancel Subscription
                        </Button>
                      </div>
                    )}
                 </div>
              ) : invoices.length > 0 ? (
                 <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white mb-4">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-bold uppercase tracking-wider text-red-700">Expired</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Your subscription has ended</h3>
                      <p className="text-slate-600">Renew your plan from the options above to regain access to premium features.</p>
                    </div>
                 </div>
              ) : (
                 <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Star className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Active Plan</h3>
                    <p className="text-slate-500 max-w-md">You currently do not have an active subscription. Choose a plan above to get started!</p>
                 </div>
              )}
            </div>
          </section>
        )}

        {/* Invoices Section */}
        {user && (
          <section className="relative z-10">
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] p-8 md:p-10 shadow-xl shadow-slate-200/50">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
                  <Receipt className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Billing History</h2>
              </div>
              
              {invoices.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center bg-slate-50/50">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-semibold text-slate-700">No payment history found</p>
                  <p className="text-sm text-slate-500 mt-1">When you purchase a plan, your invoices will appear here.</p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <div key={inv._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="hidden sm:flex p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <Receipt className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{inv.planName}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                              {new Date(inv.date).toLocaleDateString('en-US', { 
                                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded">
                              ID: {inv.stripeSessionId.slice(0, 12)}...
                            </p>
                          </div>
                        </div>
                        <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between">
                          <p className="font-extrabold text-xl text-slate-900 tracking-tight">
                            {inv.currency.toUpperCase()} {(inv.amount).toFixed(2)}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-1 mt-2 rounded-md text-xs font-bold uppercase tracking-wider ${
                            inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Cancel Warning Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-3xl font-bold text-center text-slate-900 mb-4 tracking-tight">Cancel Premium?</h2>
              <p className="text-center text-slate-600 mb-8 text-lg leading-relaxed">
                If you proceed, you will <span className="font-semibold text-orange-600">retain access</span> to your premium features until your current cycle ends. However, your subscription will not auto-renew.
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  variant="destructive" 
                  className="w-full h-14 text-lg font-bold rounded-2xl bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                  onClick={handleCancelRenewal}
                >
                  Yes, Cancel Subscription
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-14 text-lg font-bold rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-700"
                  onClick={() => setShowCancelModal(false)}
                >
                  No, Keep Premium
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
