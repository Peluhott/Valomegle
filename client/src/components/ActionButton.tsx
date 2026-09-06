import type { ReactNode } from 'react';

type ActionButtonProps = {
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'neutral';
    fullWidth?: boolean;
    stretch?: boolean;
    className?: string;
    children: ReactNode;
};

const ActionButton = ({
    onClick,
    variant = 'primary',
    fullWidth = false,
    stretch = true,
    className,
    children,
}: ActionButtonProps) => {
    const variantClasses = {
        primary: 'bg-neutral-900 hover:bg-neutral-800 text-white font-semibold',
        secondary: 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900 font-semibold',
        accent: 'bg-red-600 hover:bg-red-500 text-white font-semibold',
        outline: 'border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white font-semibold',
        neutral: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-medium',
    }[variant];

    const widthClass = fullWidth ? 'w-full' : stretch ? 'flex-1' : '';
    const sizingClass = className ? '' : 'py-2 px-4';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${widthClass} ${sizingClass} ${variantClasses} rounded-lg transition-colors${className ? ` ${className}` : ''}`}
        >
            {children}
        </button>
    );
};

export default ActionButton;
