import { RANKS, rankRangeLabel } from '../constants';

type RankSliderProps = {
    lo: number;
    hi: number;
    onChange: (lo: number, hi: number) => void;
};

const RankSlider = ({ lo, hi, onChange }: RankSliderProps) => {
    const handleClick = (i: number) => {
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
            <div className="relative h-1.5 rounded-[3px] bg-line-4 mx-2">
                <div
                    className="absolute top-0 bottom-0 rounded-[3px] bg-accent"
                    style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }}
                />
            </div>
            <div className="flex">
                {RANKS.map((name, i) => {
                    const inRange = i >= lo && i <= hi;
                    return (
                        <button
                            key={name}
                            type="button"
                            onClick={() => handleClick(i)}
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
