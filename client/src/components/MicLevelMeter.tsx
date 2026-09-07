import { useEffect, useState } from 'react';
import { useMicLevel } from '../hooks/useMicLevel';

const BAR_COUNT = 5;
const STORAGE_KEY = 'micCheckEnabled';

const readEnabled = () => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
};

const MicLevelMeter = () => {
    const [enabled, setEnabled] = useState(readEnabled);
    const { level, status } = useMicLevel(enabled);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(enabled));
        } catch {
            // storage unavailable (private mode etc.) — the toggle still works for this session
        }
    }, [enabled]);

    const toggle = (
        <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className="self-start h-8 px-3 rounded-lg border border-neutral-200 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
            {enabled ? 'Stop' : 'Test mic'}
        </button>
    );

    let body;
    if (!enabled) {
        body = <p className="text-xs text-neutral-500">Mic check is off.</p>;
    } else if (status === 'denied' || status === 'error') {
        body = (
            <p className="text-xs text-neutral-500">
                {status === 'denied' ? 'Mic permission denied — enable it to queue.' : 'Could not read mic input.'}
            </p>
        );
    } else {
        body = (
            <div className="flex items-end gap-1 h-8">
                {Array.from({ length: BAR_COUNT }, (_, i) => {
                    const threshold = (i + 1) / BAR_COUNT;
                    const active = status === 'granted' && level >= threshold - 1 / BAR_COUNT / 2;
                    return (
                        <div
                            key={i}
                            className={`w-1.5 rounded-sm transition-colors ${active ? 'bg-red-500' : 'bg-neutral-200'}`}
                            style={{ height: `${30 + i * 15}%` }}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {body}
            {toggle}
        </div>
    );
};

export default MicLevelMeter;
