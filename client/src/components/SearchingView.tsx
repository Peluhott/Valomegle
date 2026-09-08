import { useEffect, useState } from 'react';
import ActionButton from './ActionButton';

type SearchingViewProps = {
    scopeLabel: string;
    subStatus?: string;
    canWiden: boolean;
    onCancel: () => void;
    onWiden: () => void;
};

const SearchingView = ({ scopeLabel, subStatus, canWiden, onCancel, onWiden }: SearchingViewProps) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');

    return (
        <div className="border border-line rounded-card min-h-[470px] w-full flex flex-col items-center justify-center gap-6 p-10">
            <div className="w-[84px] h-[84px] rounded-full border-2 border-line-4 border-t-accent animate-spin" />
            <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="text-[26px] font-bold tracking-[-0.02em] text-ink">Finding your duo</h2>
                <p className="font-mono text-[13px] text-ink-3">{mm}:{ss} elapsed · {scopeLabel}</p>
                {subStatus && <p className="font-mono text-[13px] text-ink-3">{subStatus}</p>}
            </div>
            <div className="flex items-center gap-3">
                <ActionButton onClick={onCancel} variant="neutral" stretch={false} className="h-10 px-5 text-[14px]">
                    Cancel
                </ActionButton>
                {canWiden && (
                    <ActionButton onClick={onWiden} variant="outline" stretch={false} className="h-10 px-5 text-[14px]">
                        Widen to anybody
                    </ActionButton>
                )}
            </div>
        </div>
    );
};

export default SearchingView;
