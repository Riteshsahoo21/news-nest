import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // A helper to assign some generic icons since DB might not have them
  const iconMap = {
    politics: '🏛️', sports: '⚽', business: '💼', entertainment: '🎬',
    technology: '💻', health: '⚕️', education: '📚', lifestyle: '☕',
    science: '🔬', travel: '✈️'
  };
  const getIcon = (name) => iconMap[name?.toLowerCase()] || '📌';

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        
        const defaultCats = [
          { _id: 'politics', name: 'Politics' },
          { _id: 'sports', name: 'Sports' },
          { _id: 'business', name: 'Business' },
          { _id: 'entertainment', name: 'Entertainment' },
          { _id: 'technology', name: 'Technology' },
          { _id: 'health', name: 'Health' },
          { _id: 'education', name: 'Education' },
          { _id: 'lifestyle', name: 'Lifestyle' },
          { _id: 'science', name: 'Science' },
          { _id: 'travel', name: 'Travel' }
        ];

        const merged = [...defaultCats];
        res.data.forEach(dbCat => {
          if (!merged.some(c => c.name.toLowerCase() === dbCat.name.toLowerCase())) {
            merged.push(dbCat);
          }
        });
        
        setCategories(merged);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCats();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">All Categories</h1>
      
      {loading ? (
        <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <Link 
              key={category._id} 
              to={`/category/${encodeURIComponent(category.name.toLowerCase())}`}
            className="flex items-center justify-between p-4 bg-card border rounded-xl hover:border-primary transition-colors group shadow-sm"
          >
              <div className="flex items-center space-x-4">
                <span className="text-2xl">{getIcon(category.name)}</span>
                <span className="font-semibold text-lg group-hover:text-primary transition-colors capitalize">{category.name}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
