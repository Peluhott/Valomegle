import type { ReactNode } from 'react';

type StatusCardProps = {
    label?: string;
    children: ReactNode;
};

const StatusCard = ({ label, children }: StatusCardProps) => {
    return (
        <div className="w-full max-w-sm px-4 py-3 bg-white border border-neutral-200 rounded-lg text-neutral-700 text-sm">
            {label && <span className="text-neutral-500 text-xs uppercase tracking-wide block mb-1">{label}</span>}
            {children}
        </div>
    );
};

export default StatusCard;
