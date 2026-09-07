import type { ReactNode } from 'react';

type FieldProps = {
    label: string;
    hint?: string;
    htmlFor?: string;
    children: ReactNode;
};

// Shared control classes so every text input / select in the profile form
// stays visually identical.
export const inputClass =
    'h-10 w-full border border-line rounded-control px-3 text-[14px] text-ink bg-surface outline-none focus:border-accent box-border';
export const selectClass =
    'h-10 w-full border border-line rounded-control px-2.5 text-[14px] text-ink bg-surface outline-none focus:border-accent box-border';

// Form field wrapper: a label row (label left, optional hint right) above a
// single control.
const Field = ({ label, hint, htmlFor, children }: FieldProps) => {
    return (
        <div className="flex flex-col gap-[7px]">
            <div className="flex items-baseline justify-between">
                <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
                    {label}
                </label>
                {hint && <span className="text-[11px] text-ink-4">{hint}</span>}
            </div>
            {children}
        </div>
    );
};

export default Field;
