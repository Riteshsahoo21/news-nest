import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useSearchParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { Agentation } from 'agentation';
import { QueryProvider } from './context/QueryProvider';

// Layouts & Protection
import UserLayout from './components/layout/UserLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Loading Fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
  </div>
);

// Lazy Loaded Components
const ArticleModal = lazy(() => import('./components/ArticleModal'));
const VideoModal = lazy(() => import('./components/VideoModal'));
const PhotoGalleryModal = lazy(() => import('./components/PhotoGalleryModal'));

// User Pages
const Home = lazy(() => import('./pages/Home'));
const ArticleDetails = lazy(() => import('./pages/ArticleDetails'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const LiveBlogs = lazy(() => import('./pages/LiveBlogs'));
const LiveBlogStudio = lazy(() => import('./pages/LiveBlogStudio'));
const Videos = lazy(() => import('./pages/Videos'));
const PhotoGallery = lazy(() => import('./pages/PhotoGallery'));
const PhotoGalleryDetail = lazy(() => import('./pages/PhotoGalleryDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const FollowNetwork = lazy(() => import('./pages/FollowNetwork'));
const Categories = lazy(() => import('./pages/Categories'));
const ReporterDashboard = lazy(() => import('./pages/ReporterDashboard'));
const EditorDashboard = lazy(() => import('./pages/EditorDashboard'));
const CategoryNews = lazy(() => import('./pages/CategoryNews'));
const CategoryVideos = lazy(() => import('./pages/CategoryVideos'));
const Search = lazy(() => import('./pages/Search'));
const ApplyReporter = lazy(() => import('./pages/ApplyReporter'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const SeoManagement = lazy(() => import('./pages/admin/SeoManagement'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const EditorialApproval = lazy(() => import('./pages/admin/EditorialApproval'));
const ContentManagement = lazy(() => import('./pages/admin/ContentManagement'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const RolePermissionManagement = lazy(() => import('./pages/admin/RolePermissionManagement'));
const CategoryManagement = lazy(() => import('./pages/admin/CategoryManagement'));
const MediaLibrary = lazy(() => import('./pages/admin/MediaLibrary'));
const Polls = lazy(() => import('./pages/admin/Polls'));
const Newsletter = lazy(() => import('./pages/admin/Newsletter'));
const AdvertisementManagement = lazy(() => import('./pages/admin/AdvertisementManagement'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const AddEditor = lazy(() => import('./pages/admin/AddEditor'));
const ReporterApplications = lazy(() => import('./pages/admin/ReporterApplications'));
const Coupons = lazy(() => import('./pages/admin/Coupons'));
const Revenue = lazy(() => import('./pages/admin/Revenue'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const BroadcastNotification = lazy(() => import('./pages/admin/BroadcastNotification'));

function App({ helmetContext = {} }) {
  useEffect(() => {
    sessionStorage.removeItem('free_articles_read_list');
  }, []);

  return (
    <HelmetProvider context={helmetContext}>
      <QueryProvider>
        <AuthProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>

              {/* User Routes */}
          <Route element={<UserLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/article/:id" element={<ArticleDetails />} />
            <Route path="/live-blogs" element={<LiveBlogs />} />
            <Route path="/live-blogs/:id" element={<LiveBlogs />} />
            <Route path="/live-blog/:id" element={<LiveBlogs />} />
            <Route path="/live-blog-studio" element={<LiveBlogStudio />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/photo-gallery" element={<PhotoGallery />} />
            <Route path="/photo-gallery/:id" element={<PhotoGalleryDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user/:userId" element={<PublicProfile />} />
            <Route path="/user/:userId/:networkType" element={<FollowNetwork />} />
            <Route path="/category/:categoryId" element={<CategoryNews />} />
            <Route path="/video-category/:categoryId" element={<CategoryVideos />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/reporter/dashboard" element={<ReporterDashboard />} />
            <Route path="/editor/dashboard" element={<EditorDashboard />} />
            <Route path="/search" element={<Search />} />
            <Route path="/apply-reporter" element={<ApplyReporter />} />
          </Route>

          {/* Auth Routes (No Navbar) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} requiredPermissions={['view_admin_panel']} />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="seo-management" element={<SeoManagement />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="approvals" element={<EditorialApproval />} />
              <Route path="content" element={<ContentManagement />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="add-editor" element={<AddEditor />} />
              <Route path="roles" element={<RolePermissionManagement />} />
              <Route path="categories" element={<CategoryManagement />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="polls" element={<Polls />} />
              <Route path="newsletter" element={<Newsletter />} />
              <Route path="ads" element={<AdvertisementManagement />} />
              <Route path="reporter-applications" element={<ReporterApplications />} />
              <Route path="broadcast-notifications" element={<BroadcastNotification />} />
              <Route path="settings" element={<Settings />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit-logs" element={<AuditLogs />} />
            </Route>
          </Route>
            </Routes>
          </Suspense>
        
          <Suspense fallback={null}>
            <ArticleModalManager />
            <VideoModalManager />
            <GalleryModalManager />
          </Suspense>
          <Agentation />
        </AuthProvider>
      </QueryProvider>
    </HelmetProvider>
  );
}


// Global modal manager that watches the URL query parameters
function ArticleModalManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const articleId = searchParams.get('articleId');

  const handleClose = () => {
    // Remove the articleId from the URL but preserve other search params if they exist
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('articleId');
    setSearchParams(newParams, { replace: true });
  };

  return <ArticleModal articleId={articleId} onClose={handleClose} />;
}

function VideoModalManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const videoId = searchParams.get('videoId');

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('videoId');
    setSearchParams(newParams, { replace: true });
  };

  return <VideoModal videoId={videoId} onClose={handleClose} />;
}

function GalleryModalManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const galleryId = searchParams.get('galleryId');

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('galleryId');
    setSearchParams(newParams, { replace: true });
  };

  return <PhotoGalleryModal galleryId={galleryId} onClose={handleClose} />;
}

export default App;
