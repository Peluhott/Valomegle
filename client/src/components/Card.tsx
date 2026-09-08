import type { ReactNode } from 'react';

type CardProps = {
    label?: string;
    padding?: 20 | 24;
    dashed?: boolean;
    className?: string;
    children: ReactNode;
};

// The card chrome that repeats across the profile/home design: a bordered
// surface with an optional mono uppercase label above its contents.
const Card = ({ label, padding = 24, dashed = false, className, children }: CardProps) => {
    const chrome = dashed
        ? 'border border-dashed border-[#cfcfc9] rounded-card bg-subtle'
        : 'border border-line-2 rounded-card bg-surface';

    return (
        <div
            className={`flex flex-col gap-[18px] ${chrome}${className ? ` ${className}` : ''}`}
            style={{ padding }}
        >
            {label && (
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3">
                    {label}
                </span>
            )}
            {children}
        </div>
    );
};

export default Card;
