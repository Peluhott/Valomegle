import type { ReactNode } from 'react';

type StatusCardProps = {
    label?: string;
    children: ReactNode;
};

const StatusCard = ({ label, children }: StatusCardProps) => {
    return (
        <div className="w-full max-w-sm border border-line-2 rounded-card bg-surface px-4 py-3 text-[13px] text-ink-2">
            {label && (
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3 block mb-1">
                    {label}
                </span>
            )}
            {children}
        </div>
    );
};

export default StatusCard;
