import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';

export default function CategoryNews() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Capitalize category name for the header
  const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);

  useEffect(() => {
    const fetchCategoryNews = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/news/${categoryId}`);
        const fetchedArticles = res.data.data || res.data || [];
        // Show up to 20 articles in the grid
        setArticles(fetchedArticles.slice(0, 20));
      } catch (err) {
        console.error(err);
        setError(`Failed to fetch ${categoryName} news.`);
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchCategoryNews();
    }
  }, [categoryId, categoryName]);

  return (
    <div className="max-w-7xl mx-auto md:py-6 pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 px-4 py-4 flex items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 -ml-1 mr-4 hover:bg-muted rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold flex-1 text-center pr-8">
          {categoryName} News
        </h1>
      </div>

      {/* Content */}
      <div className="px-4 mt-6">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center text-destructive py-10">{error}</div>
        ) : articles.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No news found for {categoryName}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {articles.map((article) => (
              <div 
                key={article._id}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('articleId', article.slug || article._id);
                  setSearchParams(newParams);
                }}
                className="flex flex-col bg-card rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-border/50 group hover:shadow-md transition-shadow"
              >
                <div className="relative w-full aspect-[16/10] bg-muted overflow-hidden flex-shrink-0">
                  <img 
                    src={article.imageUrl && article.imageUrl !== 'null' ? article.imageUrl : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop'} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&h=400&fit=crop';
                    }}
                  />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">
                    {article.category || categoryName}
                  </span>
                  <h3 className="font-bold text-sm sm:text-base leading-tight text-foreground line-clamp-2 group-hover:text-red-600 transition-colors mb-2">
                    {article.title}
                  </h3>
                  {(article.snippet || article.content) && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                      {article.snippet || article.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}
                    </p>
                  )}
                  <div className="text-[11px] text-muted-foreground flex items-center space-x-2 mt-auto">
                    <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
