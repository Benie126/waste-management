import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { homeForRole } from '../../components/Layout';

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page you are looking for does not exist or you may not have access to it.
      </p>
      <div className="mt-6 flex gap-2">
        <Link to={user ? homeForRole(user.role) : '/'} className="btn-primary">
          {user ? 'Go to my dashboard' : 'Back to home'}
        </Link>
        {!user && (
          <Link to="/login" className="btn-secondary">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
