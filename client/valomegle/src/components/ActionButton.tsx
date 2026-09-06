import type { ReactNode } from 'react';

type ActionButtonProps = {
    onClick: () => void;
    variant?: 'primary' | 'secondary';
    fullWidth?: boolean;
    children: ReactNode;
};

const ActionButton = ({ onClick, variant = 'primary', fullWidth = false, children }: ActionButtonProps) => {
    const variantClasses =
        variant === 'primary'
            ? 'bg-white hover:bg-neutral-200 text-black'
            : 'bg-neutral-700 hover:bg-neutral-600 text-white';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${fullWidth ? 'w-full' : 'flex-1'} py-2 px-4 ${variantClasses} font-semibold rounded-lg transition-colors`}
        >
            {children}
        </button>
    );
};

export default ActionButton;
