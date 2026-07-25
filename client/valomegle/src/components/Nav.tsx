import { useNavigate } from 'react-router-dom';

type NavProps = {
    showLogout?: boolean;
};

const Nav = ({ showLogout = false }: NavProps) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <nav className="flex items-center justify-between h-16 px-6 bg-slate-900 border-b border-slate-700">
            <span className="text-white text-lg font-bold tracking-wide">Valomegle</span>
            {showLogout && (
                <button
                    onClick={handleLogout}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                    Log out
                </button>
            )}
        </nav>
    );
};

export default Nav;
