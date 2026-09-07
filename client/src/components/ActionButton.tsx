import type { ReactNode } from 'react';

type ActionButtonProps = {
    onClick: () => void;
    variant?: 'accent' | 'accent-clean' | 'outline' | 'neutral';
    fullWidth?: boolean;
    stretch?: boolean;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
};

const ActionButton = ({
    onClick,
    variant = 'outline',
    fullWidth = false,
    stretch = true,
    disabled = false,
    className,
    children,
}: ActionButtonProps) => {
    // Maps to the design's button styles (README "Action row" + "Hover states").
    // The only accent-filled button is `accent`; `accent-clean` is the non-dirty
    // Save state; `outline` and `neutral` cover everything else.
    const variantClasses = {
        accent: 'bg-accent text-white border border-accent hover:opacity-[.88]',
        // Non-dirty Save state: keep the label legible (ink-2), not white on the fill.
        'accent-clean': 'bg-hover text-ink-2 border border-line',
        outline: 'border border-ink text-ink hover:bg-hover font-semibold',
        neutral: 'border border-line text-ink-2 hover:bg-inset font-medium',
    }[variant];

    const widthClass = fullWidth ? 'w-full' : stretch ? 'flex-1' : '';
    const sizingClass = className ? '' : 'py-2 px-4';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${widthClass} ${sizingClass} ${variantClasses} rounded-control transition-colors disabled:cursor-not-allowed${className ? ` ${className}` : ''}`}
        >
            {children}
        </button>
    );
};

export default ActionButton;
