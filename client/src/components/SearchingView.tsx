import { useEffect, useState } from 'react';
import ActionButton from './ActionButton';
import Panel from './Panel';

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
        <Panel className="min-h-[420px] w-full max-w-xl flex flex-col items-center justify-center gap-6 p-10">
            <div className="w-20 h-20 rounded-full border-4 border-neutral-200 border-t-red-500 animate-spin" />
            <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="text-2xl font-bold text-neutral-900">Finding your duo</h2>
                <p className="text-sm text-neutral-500">{mm}:{ss} elapsed · {scopeLabel}</p>
                {subStatus && <p className="text-sm text-neutral-500">{subStatus}</p>}
            </div>
            <div className="flex items-center gap-3">
                <ActionButton onClick={onCancel} variant="neutral" stretch={false} className="h-10 px-5 text-sm">
                    Cancel
                </ActionButton>
                {canWiden && (
                    <ActionButton onClick={onWiden} variant="outline" stretch={false} className="h-10 px-5 text-sm">
                        Widen to anybody
                    </ActionButton>
                )}
            </div>
        </Panel>
    );
};

export default SearchingView;
