import { Link, useLocation } from 'react-router-dom';

const links = [
    { label: 'Home', to: '/' },
    { label: 'Play', to: '/dashboard' },
    { label: 'Profile', to: '/profile' },
];

const SideBar = () => {
    const { pathname } = useLocation();

    return (
        <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col">
            <nav className="flex flex-col gap-1 p-3 pt-4">
                {links.map(({ label, to }) => (
                    <Link
                        key={to}
                        to={to}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            pathname === to
                                ? 'bg-neutral-900 text-white'
                                : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
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
