import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { UserCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/button';

export default function FollowNetwork() {
  const { userId, networkType } = useParams(); // networkType is 'followers' or 'following'
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/user/public/${userId}`);
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to load profile', err);
        setError('User profile not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

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
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const isFollowers = networkType === 'followers';
  const users = isFollowers ? profile.followers : profile.following;
  const title = isFollowers ? 'Followers' : 'Following';

  return (
    <div className="max-w-2xl mx-auto pb-20 md:py-8 bg-background min-h-screen">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center mb-4">
        <button 
          onClick={() => navigate(`/user/${userId}`)} 
          className="p-2 -ml-2 mr-4 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="font-bold text-lg leading-tight">{profile.fullName}</h1>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
      </div>

      <div className="px-4">
        {users && users.length > 0 ? (
          <div className="flex flex-col gap-2">
            {users.map(u => (
              <Link 
                key={u._id} 
                to={`/user/${u._id}`}
                className="flex items-center gap-4 p-3 bg-card border border-border/50 hover:bg-muted/50 rounded-2xl transition-colors shadow-sm"
              >
                {u.profilePicture && !u.profilePicture.includes('ui-avatars') ? (
                  <img src={u.profilePicture} alt={u.fullName} className="w-12 h-12 rounded-full object-cover border border-border" />
                ) : (
                  <UserCircle className="w-12 h-12 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                  <span className="font-semibold text-base leading-tight">{u.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    @{u.username || u.fullName.toLowerCase().replace(/\s+/g, '')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10 bg-muted/30 rounded-2xl border border-border/50">
            No {networkType} found.
          </div>
        )}
      </div>
    </div>
  );
}
