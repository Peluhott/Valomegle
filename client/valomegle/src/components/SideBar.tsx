import { Link, useLocation } from 'react-router-dom';

const links = [
    { label: 'Home', to: '/' },
    { label: 'Play', to: '/dashboard' },
    { label: 'Profile', to: '/profile' },
];

const SideBar = () => {
    const { pathname } = useLocation();

    return (
        <aside className="w-56 bg-neutral-900 border-r border-neutral-800 flex flex-col">
            <nav className="flex flex-col gap-1 p-3 pt-4">
                {links.map(({ label, to }) => (
                    <Link
                        key={to}
                        to={to}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            pathname === to
                                ? 'bg-white text-black'
                                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                        }`}
                    >
                        {label}
                    </Link>
                ))}
            </nav>
        </aside>
    );
};

export default SideBar;
