import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';

export default function CategoryPills({ categories, selectedCategory, onSelectCategory }) {
  const [dbCategories, setDbCategories] = useState([]);
  const scrollRef = useRef(null);

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!categories || categories.length === 0) {
      const fetchCats = async () => {
        try {
          const res = await api.get('/categories');
          setDbCategories(res.data);
        } catch (error) {
          console.error("Failed to fetch categories", error);
        }
      };
      fetchCats();
    }
  }, [categories]);

  const defaultCategories = [
    { _id: 'world', name: 'World' },
    { _id: 'politics', name: 'Politics' }, 
    { _id: 'business', name: 'Business' }, 
    { _id: 'technology', name: 'Technology' },
    { _id: 'sports', name: 'Sports' }, 
    { _id: 'science', name: 'Science' },
    { _id: 'health', name: 'Health' },
    { _id: 'entertainment', name: 'Entertainment' },
    { _id: 'lifestyle', name: 'Lifestyle' }
  ];

  const mergedCategories = [...defaultCategories];
  dbCategories.forEach(dbCat => {
    if (!mergedCategories.some(c => c.name.toLowerCase() === dbCat.name.toLowerCase())) {
      mergedCategories.push(dbCat);
    }
  });

  const displayCategories = categories?.length > 0 
    ? categories 
    : [{ _id: 'all', name: 'All' }, ...mergedCategories];

  return (
    <div className="w-full relative group">
      {/* Left Scroll Gradient & Button */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 flex items-center justify-start pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={scrollLeft}
          className="pointer-events-auto bg-white dark:bg-gray-800 shadow-md rounded-full p-1 border border-border hover:bg-gray-50 dark:hover:bg-gray-700 ml-1"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto hide-scrollbar py-2 space-x-3 scroll-smooth px-2"
      >
        {displayCategories.map((category) => {
          const isSelected = selectedCategory === category._id || selectedCategory === category.name;
          
          return (
            <button
              key={category._id}
              onClick={() => onSelectCategory && onSelectCategory(category)}
              className={`flex items-center whitespace-nowrap px-5 py-1.5 rounded-full text-[13px] font-sans transition-colors border shrink-0 capitalize ${
                isSelected 
                  ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm' 
                  : 'bg-card text-foreground border-border hover:border-gray-300 hover:bg-muted'
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Right Scroll Gradient & Button */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 flex items-center justify-end pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={scrollRight}
          className="pointer-events-auto bg-white dark:bg-gray-800 shadow-md rounded-full p-1 border border-border hover:bg-gray-50 dark:hover:bg-gray-700 mr-1"
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
      </div>
    </div>
  );
}
