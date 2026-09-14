import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import apiClient from '../api/client';

const linkBase = 'pb-[3px] border-b-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';
const activeLink = `${linkBase} text-ink border-accent`;
const inactiveLink = `${linkBase} text-ink-dis border-transparent`;

const Nav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading } = useCurrentUser();

    const handleLogout = async () => {
        try {
            await apiClient.post('/api/users/logout');
        } finally {
            navigate('/');
        }
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="flex items-center justify-between px-8 py-4 border-b border-line-3">
            <div className="flex items-center gap-8">
                <span className="font-sans font-bold text-[18px] tracking-tight text-ink">Valomegle</span>
                <div className="flex gap-6 text-[14px] font-medium">
                    <Link to="/dashboard" className={isActive('/dashboard') ? activeLink : inactiveLink}>
                        Find a duo
                    </Link>
                    <Link to="/history" className={isActive('/history') ? activeLink : inactiveLink}>
                        Past duos
                    </Link>
                    <Link to="/friends" className={isActive('/friends') ? activeLink : inactiveLink}>
                        Friends
                    </Link>
                    <Link to="/profile" className={isActive('/profile') ? activeLink : inactiveLink}>
                        Profile
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-3.5">
                <div className="h-[30px] px-3 border border-line rounded-control flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-line-3" />
                    <span className="text-[13px] text-ink truncate">
                        {loading ? '' : (user?.username ?? '')}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="text-[13px] text-ink-3 hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                    Log out
                </button>
            </div>
        </nav>
    );
};

export default Nav;
