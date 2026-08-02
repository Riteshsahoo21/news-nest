import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export default function SubscriptionPlansManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: 'monthly',
    features: '', // comma separated string for input
    isActive: true
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions/plans');
      setPlans(res.data);
    } catch (err) {
      console.error('Error fetching plans', err);
      setError('Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan = null) => {
    setFormError('');
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: plan.price.toString(),
        duration: plan.duration,
        features: plan.features ? plan.features.join('\n') : '',
        isActive: plan.isActive
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        duration: 'monthly',
        features: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.name || !formData.price || isNaN(formData.price)) {
      setFormError('Please provide a valid name and price.');
      return;
    }

    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        features: formData.features.split('\n').map(f => f.trim()).filter(f => f !== '')
      };

      if (editingPlan) {
        const res = await api.put(`/subscriptions/plans/${editingPlan._id}`, payload);
        setPlans(plans.map(p => p._id === editingPlan._id ? res.data.plan : p));
      } else {
        const res = await api.post('/subscriptions/plans', payload);
        setPlans([...plans, res.data.plan].sort((a, b) => a.price - b.price));
      }
      
      handleCloseModal();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.error || 'Failed to save subscription plan');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/subscriptions/plans/${id}`);
      setPlans(plans.filter(p => p._id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete plan');
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
          <p className="text-gray-500 mt-1">Create and manage subscription tiers for users.</p>
        </div>
        <Button 
          onClick={() => handleOpenModal()} 
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
          <ShieldAlert className="w-5 h-5" />
          {error}
        </div>
      )}

      {plans.length === 0 && !error ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Plans Available</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">You haven't created any subscription plans yet. Click the button below to add your first premium tier.</p>
          <Button onClick={() => handleOpenModal()} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            Create First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan._id} className={`group relative rounded-3xl p-[1px] overflow-hidden transition-all duration-500 hover:scale-[1.02] ${!plan.isActive ? 'opacity-60 grayscale-[0.5]' : 'hover:shadow-2xl hover:shadow-red-500/20'}`}>
              {/* Animated Gradient Border */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-200 via-transparent to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
              
              <div className={`relative h-full rounded-[23px] flex flex-col p-8 ${plan.isActive ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold capitalize text-gray-900 font-serif tracking-tight group-hover:text-red-600 transition-colors">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-2">{plan.description || 'No description provided.'}</p>
                  </div>
                  {!plan.isActive && (
                    <span className="bg-gray-100 text-gray-500 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-gray-200">
                      Inactive
                    </span>
                  )}
                  {plan.isActive && plan.duration === 'yearly' && (
                    <span className="bg-red-50 text-red-600 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-red-100">
                      Best Value
                    </span>
                  )}
                </div>
                
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-tighter">₹{plan.price}</span>
                  <span className="text-gray-500 font-medium">/{plan.duration === 'yearly' ? 'yr' : plan.duration === '6_months' ? '6mo' : 'mo'}</span>
                </div>

                <div className="space-y-4 mb-8 flex-1">
                  {plan.features && plan.features.length > 0 ? (
                    plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-red-600" strokeWidth={3} />
                        </div>
                        <span className="font-medium">{feature}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400 italic">No specific features listed.</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100 mt-auto">
                  <Button 
                    onClick={() => handleOpenModal(plan)} 
                    variant="outline" 
                    className="w-full rounded-xl border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors h-11"
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button 
                    onClick={() => handleDelete(plan._id, plan.name)} 
                    variant="outline" 
                    className="w-full rounded-xl border-red-100 hover:bg-red-50 text-red-600 transition-colors h-11"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-600" />
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                  {formError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Plan Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Premium"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <input 
                    type="text" 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Short summary of this plan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Price (₹) *</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="999"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Duration *</label>
                    <select 
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-white"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="6_months">6 Months (Half-Yearly)</option>
                      <option value="yearly">Yearly (Annually)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Features (One per line)</label>
                  <textarea 
                    value={formData.features}
                    onChange={(e) => setFormData({...formData, features: e.target.value})}
                    placeholder="Ad-free experience&#10;Access to premium articles&#10;Exclusive newsletters"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all h-28 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Press Enter to separate features.</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                    Plan is active and available for purchase
                  </label>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="border-gray-200">
                  Cancel
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]">
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
