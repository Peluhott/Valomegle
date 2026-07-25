import { Link, useLocation } from 'react-router-dom';

const links = [
    { label: 'Home', to: '/' },
    { label: 'Play', to: '/dashboard' },
];

const SideBar = () => {
    const { pathname } = useLocation();

    return (
        <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col">
            <nav className="flex flex-col gap-1 p-3 pt-4">
                {links.map(({ label, to }) => (
                    <Link
                        key={to}
                        to={to}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            pathname === to
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
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
