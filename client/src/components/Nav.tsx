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
        <nav className="flex items-center justify-between h-16 px-6 bg-neutral-100 border-b border-neutral-200">
            <span className="text-neutral-900 text-lg font-bold tracking-wide">Valomegle</span>
            {showLogout && (
                <button
                    onClick={handleLogout}
                    className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                    Log out
                </button>
            )}
        </nav>
    );
};

export default Nav;
