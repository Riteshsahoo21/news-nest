import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', description: '', isActive: true, contentTypes: ['article', 'video', 'live_blog', 'photo_gallery'] });

  const CONTENT_TYPE_OPTIONS = [
    { value: 'article', label: 'Article News' },
    { value: 'video', label: 'Video News' },
    { value: 'live_blog', label: 'Live Blog' },
    { value: 'photo_gallery', label: 'Photo Gallery' }
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories/admin');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setFormData({ 
        id: category._id, 
        name: category.name, 
        description: category.description || '', 
        isActive: category.isActive,
        contentTypes: category.contentTypes || ['article', 'video', 'live_blog', 'photo_gallery'] 
      });
    } else {
      setFormData({ id: null, name: '', description: '', isActive: true, contentTypes: ['article', 'video', 'live_blog', 'photo_gallery'] });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/categories/${formData.id}`, { name: formData.name, description: formData.description, isActive: formData.isActive, contentTypes: formData.contentTypes });
      } else {
        await api.post('/categories', { name: formData.name, description: formData.description, contentTypes: formData.contentTypes });
      }
      setShowModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category', error);
      alert(error.response?.data?.error || 'Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await api.delete(`/categories/${id}`);
        setCategories(categories.filter(c => c._id !== id));
      } catch (error) {
        console.error('Failed to delete category', error);
        alert(error.response?.data?.error || 'Failed to delete category');
      }
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
          <p className="text-gray-500 mt-1">Add, edit, or remove news categories.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-red-600 hover:bg-red-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category._id} className="shadow-sm border-gray-200">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-gray-900 capitalize">{category.name}</h3>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${category.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {category.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <p className="text-sm text-gray-500 mb-4 flex-1">
                {category.description || 'No description provided.'}
              </p>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {category.contentTypes && category.contentTypes.map(type => (
                  <span key={type} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] uppercase font-bold rounded">
                    {type.replace('_', ' ')}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <Button onClick={() => handleOpenModal(category)} variant="outline" className="flex-1 text-gray-600 hover:text-blue-600 border-gray-200 hover:bg-blue-50 hover:border-blue-200 h-9">
                  <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                </Button>
                <Button onClick={() => handleDelete(category._id)} variant="outline" className="flex-1 text-gray-600 hover:text-red-600 border-gray-200 hover:bg-red-50 hover:border-red-200 h-9">
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{formData.id ? 'Edit Category' : 'Add Category'}</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g. Technology"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
                  placeholder="Category description..."
                  rows="3"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applies to Content Types</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
                      <input 
                        type="checkbox"
                        checked={formData.contentTypes.includes(option.value)}
                        onChange={(e) => {
                          const newTypes = e.target.checked 
                            ? [...formData.contentTypes, option.value]
                            : formData.contentTypes.filter(t => t !== option.value);
                          setFormData({ ...formData, contentTypes: newTypes });
                        }}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {formData.id && (
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (Visible to users)</label>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" onClick={() => setShowModal(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  {formData.id ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
