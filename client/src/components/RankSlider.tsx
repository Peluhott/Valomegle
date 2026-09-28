import { useCallback, useEffect, useRef, useState } from 'react';
import { RANKS, rankRangeLabel } from '../constants';

type RankSliderProps = {
    lo: number;
    hi: number;
    onChange: (lo: number, hi: number) => void;
};

type Thumb = 'lo' | 'hi';

const RankSlider = ({ lo, hi, onChange }: RankSliderProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<Thumb | null>(null);

    // Keep drag handlers reading fresh props/state without re-subscribing the
    // window listeners on every lo/hi change mid-drag.
    const latest = useRef({ lo, hi, onChange });
    latest.current = { lo, hi, onChange };

    const indexFromClientX = useCallback((clientX: number) => {
        const track = trackRef.current;
        if (!track) return 0;
        const rect = track.getBoundingClientRect();
        const ratio = rect.width === 0 ? 0 : Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        return Math.round(ratio * (RANKS.length - 1));
    }, []);

    useEffect(() => {
        if (!dragging) return undefined;

        const handleMove = (e: PointerEvent) => {
            const idx = indexFromClientX(e.clientX);
            const { lo: curLo, hi: curHi, onChange: change } = latest.current;
            if (dragging === 'lo') change(Math.min(idx, curHi), curHi);
            else change(curLo, Math.max(idx, curLo));
        };
        const stopDragging = () => setDragging(null);

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', stopDragging);
        window.addEventListener('pointercancel', stopDragging);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
        };
    }, [dragging, indexFromClientX]);

    const startDrag = (thumb: Thumb) => (e: React.PointerEvent) => {
        e.preventDefault();
        setDragging(thumb);
    };

    const handleLabelClick = (i: number) => {
        if (Math.abs(i - lo) <= Math.abs(i - hi)) onChange(Math.min(i, hi), hi);
        else onChange(lo, Math.max(i, lo));
    };

    const label = rankRangeLabel(lo, hi);
    const pct = (i: number) => (i / (RANKS.length - 1)) * 100;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3">Rank range</span>
                <span className="text-[13px] font-medium text-ink">{label}</span>
            </div>
            <div ref={trackRef} className="relative h-1.5 rounded-[3px] bg-line-4 mx-2">
                <div
                    className="absolute top-0 bottom-0 rounded-[3px] bg-accent"
                    style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }}
                />
                {(['lo', 'hi'] as const).map((thumb) => (
                    <button
                        key={thumb}
                        type="button"
                        aria-label={thumb === 'lo' ? 'Minimum rank' : 'Maximum rank'}
                        onPointerDown={startDrag(thumb)}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-surface border-2 border-accent shadow-sm cursor-grab touch-none active:cursor-grabbing"
                        style={{ left: `${pct(thumb === 'lo' ? lo : hi)}%` }}
                    />
                ))}
            </div>
            <div className="flex">
                {RANKS.map((name, i) => {
                    const inRange = i >= lo && i <= hi;
                    return (
                        <button
                            key={name}
                            type="button"
                            onClick={() => handleLabelClick(i)}
                            className={`flex-1 py-1 font-mono text-[10px] font-medium transition-colors ${
                                inRange ? 'text-ink' : 'text-ink-4 hover:text-ink-3'
                            }`}
                        >
                            {name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default RankSlider;
