import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    discountType: 'percent', // percent or amount
    percentOff: '',
    amountOff: '',
    currency: 'inr',
    duration: 'once', // once, repeating, forever
    durationInMonths: ''
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stripe/coupons');
      setCoupons(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleDelete = async (id, couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.delete(`/stripe/coupons/${couponId}`);
      setCoupons(coupons.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete coupon');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.discountType === 'percent') {
        delete payload.amountOff;
        delete payload.currency;
      } else {
        delete payload.percentOff;
        payload.amountOff = parseInt(payload.amountOff) * 100; // Convert to paise/cents
      }
      
      await api.post('/stripe/coupons', payload);
      setShowModal(false);
      fetchCoupons();
    } catch (err) {
      console.error(err);
      alert('Failed to create coupon: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Coupons</h2>
          <p className="text-muted-foreground mt-1">Manage discount and promotion codes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Coupon
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading coupons...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-semibold text-gray-600">Code</th>
                <th className="p-4 font-semibold text-gray-600">Name</th>
                <th className="p-4 font-semibold text-gray-600">Discount</th>
                <th className="p-4 font-semibold text-gray-600">Duration</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((promo) => (
                <tr key={promo.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-red-600 font-mono">{promo.code}</td>
                  <td className="p-4">{promo.promotion?.coupon?.name || '-'}</td>
                  <td className="p-4">
                    {promo.promotion?.coupon?.percent_off ? `${promo.promotion.coupon.percent_off}% off` : `₹${promo.promotion?.coupon?.amount_off / 100} off`}
                  </td>
                  <td className="p-4 capitalize">
                    {promo.promotion?.coupon?.duration} 
                    {promo.promotion?.coupon?.duration === 'repeating' && ` (${promo.promotion.coupon.duration_in_months} months)`}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(promo.id, promo.promotion?.coupon?.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No active coupons found. Create one to offer discounts!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Tag className="h-5 w-5 text-red-600" />
                Create New Coupon
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Name (Internal)</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Summer Sale 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promotion Code (What users type)</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500 uppercase font-mono"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  placeholder="e.g. SUMMER50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500"
                    value={formData.discountType}
                    onChange={e => setFormData({...formData, discountType: e.target.value})}
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="amount">Fixed Amount (₹)</option>
                  </select>
                </div>
                
                {formData.discountType === 'percent' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percent Off</label>
                    <input
                      type="number"
                      required
                      min="1" max="100"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500"
                      value={formData.percentOff}
                      onChange={e => setFormData({...formData, percentOff: e.target.value})}
                      placeholder="e.g. 20"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Off (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500"
                      value={formData.amountOff}
                      onChange={e => setFormData({...formData, amountOff: e.target.value})}
                      placeholder="e.g. 500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500"
                    value={formData.duration}
                    onChange={e => setFormData({...formData, duration: e.target.value})}
                  >
                    <option value="once">Once</option>
                    <option value="repeating">Repeating</option>
                    <option value="forever">Forever</option>
                  </select>
                </div>
                
                {formData.duration === 'repeating' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration in Months</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500"
                      value={formData.durationInMonths}
                      onChange={e => setFormData({...formData, durationInMonths: e.target.value})}
                      placeholder="e.g. 3"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
