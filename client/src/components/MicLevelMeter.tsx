import { useEffect, useState } from 'react';
import { useMicLevel } from '../hooks/useMicLevel';

const BAR_COUNT = 24;
const MIN_BAR_HEIGHT = 5;
const MAX_BAR_HEIGHT = 24;
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

    const blocked = enabled && (status === 'denied' || status === 'error');
    const live = enabled && !blocked;

    let note;
    if (blocked) {
        note = status === 'denied' ? 'Mic permission denied — enable it to queue.' : 'Could not read mic input.';
    } else if (enabled) {
        note = 'Input detected. Level meter is live.';
    } else {
        note = 'No input — queueing is blocked until a mic is detected.';
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3">Mic check</span>
                <button
                    type="button"
                    onClick={() => setEnabled((v) => !v)}
                    className="text-[12px] underline text-ink-3 hover:text-ink cursor-pointer"
                >
                    {enabled ? 'Disable' : 'Enable'}
                </button>
            </div>

            <div className="h-10 border border-dashed border-[#cfcfc9] rounded-control flex items-end gap-[3px] px-3 py-2">
                {Array.from({ length: BAR_COUNT }, (_, i) => {
                    // Same per-bar threshold idea as the old 5-bar meter: a bar lights up once
                    // the input level clears its slot, and taller bars sit further along the row.
                    const threshold = (i + 1) / BAR_COUNT;
                    const active =
                        live && (status === 'granted' || status === 'requesting') && level >= threshold - 1 / BAR_COUNT / 2;
                    const height = active
                        ? MIN_BAR_HEIGHT + Math.round((i / (BAR_COUNT - 1)) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT))
                        : live
                          ? MIN_BAR_HEIGHT
                          : 3;
                    return (
                        <div
                            key={i}
                            className={`w-[3px] rounded-[2px] transition-[height] ${live ? 'bg-[#c2c2bb]' : 'bg-line-3'}`}
                            style={{ height: `${height}px` }}
                        />
                    );
                })}
            </div>

            <p className="text-[12px] text-ink-3 leading-[1.45]">{note}</p>
        </div>
    );
};

export default MicLevelMeter;
