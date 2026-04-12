import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { clearAuthToken, hasAuthToken } from '@/lib/auth';

const ProtectedRoute = () => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!hasAuthToken()) {
        setIsAllowed(false);
        setIsChecking(false);
        return;
      }

      try {
        await apiClient.get('/auth/me');
        setIsAllowed(true);
      } catch {
        clearAuthToken();
        setIsAllowed(false);
      } finally {
        setIsChecking(false);
      }
    };

    void validate();
  }, []);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Verifying access...
      </div>
    );
  }

  if (!isAllowed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
