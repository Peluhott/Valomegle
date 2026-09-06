import type { ReactNode } from 'react';

type StatusCardProps = {
    label?: string;
    children: ReactNode;
};

const StatusCard = ({ label, children }: StatusCardProps) => {
    return (
        <div className="w-full max-w-sm px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 text-sm">
            {label && <span className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">{label}</span>}
            {children}
        </div>
    );
};

export default StatusCard;
