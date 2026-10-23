import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function Categories() {
  const location = useLocation();
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
    <div className="mx-auto min-h-[55vh] w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 animate-page-enter">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Explore RitzlaNews</p>
      <h1 className="text-3xl font-black tracking-tight mb-3 sm:text-4xl">All Categories</h1>
      <p className="mb-7 max-w-2xl text-sm leading-6 text-muted-foreground">Choose a topic to see its latest reporting.</p>
      
      {loading ? (
        <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((category) => (
            <Link 
              key={category._id} 
              to={`/category/${encodeURIComponent(category.name.toLowerCase())}`}
              state={{ from: location.pathname }}
              viewTransition
              className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
              <div className="flex items-center space-x-4">
                <span className="text-2xl">{getIcon(category.name)}</span>
                <span className="font-semibold text-lg group-hover:text-primary transition-colors duration-200 capitalize">{category.name}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
