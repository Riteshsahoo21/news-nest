import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { UserCircle, MapPin, Calendar, Star, ShieldCheck, FileEdit, Globe, ArrowLeft, X } from 'lucide-react';
import { Twitter, Linkedin } from '../components/BrandIcons';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

export default function PublicProfile() {
  const { userId } = useParams();
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/user/public/${userId}`);
        setProfile(res.data);
        setFollowersCount(res.data.followersCount || 0);
        
        // Determine initial follow status
        if (user && res.data.followers) {
          setIsFollowing(res.data.followers.some(f => f._id === user._id));
        }
      } catch (err) {
        console.error('Failed to load profile', err);
        setError('User profile not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };

    const fetchNews = async () => {
      try {
        const res = await api.get(`/news/author/${userId}`);
        setNews(res.data || []);
      } catch (err) {
        console.error('Failed to load news', err);
      } finally {
        setNewsLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
      fetchNews();
    }
  }, [userId, user]);

  const handleToggleFollow = async () => {
    if (!user) return; // Should be handled by UI button (Login link)
    
    // Optimistic UI update
    setIsFollowing(!isFollowing);
    setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1);

    try {
      const res = await api.post(`/user/${userId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure sync with server
      setIsFollowing(res.data.isFollowing);
      setFollowersCount(res.data.followersCount);
      // We'd ideally re-fetch profile to update the followers list here, but optimistically is fine.
      const resProfile = await api.get(`/user/public/${userId}`);
      setProfile(resProfile.data);
    } catch (err) {
      console.error('Failed to toggle follow', err);
      // Revert on failure
      setIsFollowing(isFollowing);
      setFollowersCount(prev => isFollowing ? prev + 1 : prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] bg-background text-center px-4">
        <UserCircle className="w-24 h-24 text-muted-foreground/30 mb-6" />
        <h2 className="text-2xl font-bold font-serif mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground mb-8">{error}</p>
        <Link to="/">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Button>
        </Link>
      </div>
    );
  }

  const userRoles = profile.roles || (profile.role ? [profile.role] : []);
  const isOwnProfile = user && user._id === profile._id;

  return (
    <div className="max-w-7xl mx-auto pb-20 md:pb-12 bg-background min-h-screen">
      
      {/* Premium Cover Header */}
      <div className="h-48 md:h-64 w-full bg-gradient-to-r from-slate-900 via-zinc-800 to-slate-900 relative rounded-b-[2.5rem] shadow-lg mb-16 md:mb-20 overflow-hidden">
        <div className="absolute top-6 left-6 md:top-8 md:left-8">
          <Link to="/">
            <Button variant="ghost" className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 rounded-full h-10 w-10 p-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-32 md:-mt-40 relative z-10 mx-auto">
        <div className="bg-card border border-border/50 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-sm relative overflow-hidden flex flex-col items-center">
          
          {/* Avatar */}
          <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/60 rounded-full animate-pulse blur-md opacity-40"></div>
            <div className="relative w-full h-full bg-card rounded-full border-4 border-background flex items-center justify-center shadow-inner overflow-hidden">
              {profile.profilePicture && !profile.profilePicture.includes('ui-avatars') ? (
                <img src={profile.profilePicture} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-24 h-24 text-muted-foreground" />
              )}
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold font-serif text-foreground tracking-tight">
            {profile.fullName}
          </h1>
          <p className="text-muted-foreground font-medium mt-1 mb-2">
            @{profile.username || profile.fullName.toLowerCase().replace(/\s+/g, '')}
          </p>

          {/* Social Stats and Follow Button */}
          <div className="flex flex-col items-center mt-6 mb-8 w-full">
            <div className="flex gap-8 mb-6 text-center">
              <Link 
                to={`/user/${userId}/followers`}
                className="cursor-pointer hover:opacity-70 transition-opacity"
              >
                <span className="block text-xl font-bold">{followersCount}</span>
                <span className="text-sm text-muted-foreground">Followers</span>
              </Link>
              <Link 
                to={`/user/${userId}/following`}
                className="cursor-pointer hover:opacity-70 transition-opacity"
              >
                <span className="block text-xl font-bold">{profile.followingCount || 0}</span>
                <span className="text-sm text-muted-foreground">Following</span>
              </Link>
            </div>

            {!isOwnProfile && (
              <div className="w-full max-w-[200px]">
                {user ? (
                  <Button 
                    onClick={handleToggleFollow} 
                    className={`w-full ${isFollowing ? 'bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                ) : (
                  <Link to="/login" className="w-full">
                    <Button className="w-full bg-primary text-primary-foreground">
                      Login to Follow
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-6">
            {profile.location && (
              <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4 text-primary/70" /> {profile.location}
              </span>
            )}
            <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
              <Calendar className="w-4 h-4 text-primary/70" /> Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {profile.isPremium && (
              <div className="inline-flex items-center justify-center gap-1.5 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> Premium Member
              </div>
            )}
            {userRoles.includes('reporter') && !userRoles.some(r => ['admin', 'editor'].includes(r)) && (
              <div className="inline-flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-bold">
                <FileEdit className="w-4 h-4" /> Official Reporter
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="w-full max-w-2xl pt-4 text-center">
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed italic font-serif">
                "{profile.bio}"
              </p>
            </div>
          )}

          {/* Social Links */}
          {profile.socialLinks && Object.values(profile.socialLinks).some(link => link) && (
            <div className="w-full max-w-2xl mt-8 pt-8 border-t border-border/50 flex justify-center gap-4">
              {profile.socialLinks.twitter && (
                <a href={profile.socialLinks.twitter.startsWith('http') ? profile.socialLinks.twitter : `https://${profile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-muted hover:bg-blue-50 rounded-xl transition-colors group">
                  <Twitter className="w-6 h-6 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                </a>
              )}
              {profile.socialLinks.linkedin && (
                <a href={profile.socialLinks.linkedin.startsWith('http') ? profile.socialLinks.linkedin : `https://${profile.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-muted hover:bg-blue-50 rounded-xl transition-colors group">
                  <Linkedin className="w-6 h-6 text-muted-foreground group-hover:text-blue-700 transition-colors" />
                </a>
              )}
              {profile.socialLinks.website && (
                <a href={profile.socialLinks.website.startsWith('http') ? profile.socialLinks.website : `https://${profile.socialLinks.website}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-muted hover:bg-slate-100 rounded-xl transition-colors group">
                  <Globe className="w-6 h-6 text-muted-foreground group-hover:text-slate-700 transition-colors" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Reporter's News Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold font-serif mb-6 pl-2 border-l-4 border-primary">
            Articles by {profile.fullName.split(' ')[0]}
          </h2>
          
          {newsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 bg-muted/30 rounded-2xl border border-border/50">
              No published articles found for this reporter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {news.map((article) => (
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
                      {article.category}
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
    </div>
  );
}
