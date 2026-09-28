import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { CallProvider } from '../context/CallContext';

const ProtectedRoute = () => {
    const { user, loading } = useCurrentUser();

    if (loading) return null;
    if (!user) return <Navigate to="/" replace />;

    return (
        <CallProvider>
            <Outlet />
        </CallProvider>
    );
};

export default ProtectedRoute;
