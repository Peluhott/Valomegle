import type { ReactNode } from 'react';

type PanelProps = {
    children: ReactNode;
    label?: string;
    accent?: 'red' | 'dashed';
    className?: string;
};

const Panel = ({ children, label, accent, className = '' }: PanelProps) => {
    const borderClass =
        accent === 'red' ? 'border-red-600/60' : accent === 'dashed' ? 'border-dashed border-neutral-200' : 'border-neutral-200';
    const bgClass = accent === 'dashed' ? 'bg-transparent' : 'bg-white';

    return (
        <div className={`border ${borderClass} rounded-xl ${bgClass} ${className}`}>
            {label && <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>}
            {children}
        </div>
    );
};

export default Panel;
