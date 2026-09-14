import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';

const PublicRoute = () => {
    const { user, loading } = useCurrentUser();

    if (loading) return null;
    if (user) return <Navigate to="/dashboard" replace />;

    return <Outlet />;
};

export default PublicRoute;
