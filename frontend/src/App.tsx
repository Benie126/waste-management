import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { homeForRole } from './components/Layout';

// Public
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

// Producer
import ProducerDashboard from './pages/producer/ProducerDashboard';
import MyListingsPage from './pages/producer/MyListingsPage';
import ListingFormPage from './pages/producer/ListingFormPage';
import ListingDetailPage from './pages/producer/ListingDetailPage';
import PickupRequestsPage from './pages/producer/PickupRequestsPage';
import PickupDetailPage from './pages/producer/PickupDetailPage';
import CollectionHistoryPage from './pages/producer/CollectionHistoryPage';

// Collector
import CollectorDashboard from './pages/collector/CollectorDashboard';
import AvailableWastePage from './pages/collector/AvailableWastePage';
import WasteDetailPage from './pages/collector/WasteDetailPage';
import CollectorRequestsPage from './pages/collector/CollectorRequestsPage';
import CollectorRequestDetailPage from './pages/collector/CollectorRequestDetailPage';
import RecommendedPage from './pages/collector/RecommendedPage';
import CollectorCollectionsPage from './pages/collector/CollectorCollectionsPage';

// Organization
import OrganizationDashboard from './pages/organization/OrganizationDashboard';
import AcceptedMaterialsPage from './pages/organization/AcceptedMaterialsPage';
import OrganizationListingsPage from './pages/organization/OrganizationListingsPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import CollectorVerificationPage from './pages/admin/CollectorVerificationPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import AdminListingsPage from './pages/admin/AdminListingsPage';
import AdminPickupsPage from './pages/admin/AdminPickupsPage';
import ActivitiesPage from './pages/admin/ActivitiesPage';

// Common
import ProfilePage from './pages/common/ProfilePage';
import NotificationsPage from './pages/common/NotificationsPage';
import NotFoundPage from './pages/common/NotFoundPage';

/** Sends a logged-in user from "/" to their role dashboard. */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to={homeForRole(user.role)} replace /> : <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authenticated area: all roles share the sidebar layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Producer */}
        <Route
          path="/producer"
          element={
            <ProtectedRoute roles={['WASTE_PRODUCER']}>
              <ProducerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/producer/listings"
          element={
            <ProtectedRoute roles={['WASTE_PRODUCER']}>
              <MyListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/producer/listings/new"
          element={
            <ProtectedRoute roles={['WASTE_PRODUCER']}>
              <ListingFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/producer/listings/:id/edit"
          element={
            <ProtectedRoute roles={['WASTE_PRODUCER']}>
              <ListingFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/producer/listings/:id"
          element={
            <ProtectedRoute roles={['WASTE_PRODUCER']}>
              <ListingDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/producer/requests"
          element={
            <ProtectedRoute roles={['WASTE_PRODUCER']}>
              <PickupRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/producer/requests/:id"
          element={
            <ProtectedRoute roles={['WASTE_PRODUCER']}>
              <PickupDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/producer/history"
          element={
            <ProtectedRoute roles={['WASTE_PRODUCER']}>
              <CollectionHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Collector */}
        <Route
          path="/collector"
          element={
            <ProtectedRoute roles={['COLLECTOR']}>
              <CollectorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collector/available"
          element={
            <ProtectedRoute roles={['COLLECTOR']}>
              <AvailableWastePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collector/waste/:id"
          element={
            <ProtectedRoute roles={['COLLECTOR']}>
              <WasteDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collector/recommended"
          element={
            <ProtectedRoute roles={['COLLECTOR']}>
              <RecommendedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collector/requests"
          element={
            <ProtectedRoute roles={['COLLECTOR']}>
              <CollectorRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collector/requests/:id"
          element={
            <ProtectedRoute roles={['COLLECTOR']}>
              <CollectorRequestDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collector/collections"
          element={
            <ProtectedRoute roles={['COLLECTOR']}>
              <CollectorCollectionsPage />
            </ProtectedRoute>
          }
        />

        {/* Recycling organization */}
        <Route
          path="/organization"
          element={
            <ProtectedRoute roles={['RECYCLING_ORGANIZATION']}>
              <OrganizationDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization/materials"
          element={
            <ProtectedRoute roles={['RECYCLING_ORGANIZATION']}>
              <AcceptedMaterialsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization/listings"
          element={
            <ProtectedRoute roles={['RECYCLING_ORGANIZATION']}>
              <OrganizationListingsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/collectors"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <CollectorVerificationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/listings"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pickups"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminPickupsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/activities"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <ActivitiesPage />
            </ProtectedRoute>
          }
        />

        {/* Common */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
