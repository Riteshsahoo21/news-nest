import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import SafeImage from '../components/common/SafeImage';

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
                <div className="relative w-full aspect-[16/10] max-h-[145px] sm:max-h-none bg-muted overflow-hidden shrink-0">
                  {article.mediaUrls && article.mediaUrls.length > 1 ? (
                    <div className="w-full h-full flex overflow-hidden">
                      <SafeImage 
                        src={article.mediaUrls[0]} 
                        alt={article.title} 
                        category={article.category || categoryName}
                        subCategory={article.subCategory}
                        country={article.country}
                        className="w-1/2 h-full object-cover pr-[1px] transition-transform duration-300 group-hover:scale-105"
                      />
                      {article.mediaUrls.length > 2 ? (
                        <div className="w-1/2 h-full flex flex-col pl-[1px] overflow-hidden">
                          <SafeImage 
                            src={article.mediaUrls[1]} 
                            alt={article.title}
                            category={article.category || categoryName}
                            subCategory={article.subCategory}
                            country={article.country}
                            className="w-full h-1/2 object-cover pb-[1px] transition-transform duration-300 group-hover:scale-105" 
                          />
                          <div className="relative w-full h-1/2 pt-[1px] overflow-hidden">
                            <SafeImage 
                              src={article.mediaUrls[2]} 
                              alt={article.title}
                              category={article.category || categoryName}
                              subCategory={article.subCategory}
                              country={article.country}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                            {article.mediaUrls.length > 3 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs pointer-events-none mt-[1px]">
                                +{article.mediaUrls.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <SafeImage 
                          src={article.mediaUrls[1]} 
                          alt={article.title} 
                          category={article.category || categoryName}
                          subCategory={article.subCategory}
                          country={article.country}
                          className="w-1/2 h-full object-cover pl-[1px] transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                  ) : (
                    <SafeImage 
                      src={article.imageUrl || article.mainImageUrl} 
                      alt={article.title}
                      category={article.category || categoryName}
                      subCategory={article.subCategory}
                      country={article.country}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
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
