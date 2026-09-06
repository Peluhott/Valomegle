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
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-neutral-500">Rank range</span>
                <span className="text-sm font-medium text-neutral-900">{label}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-neutral-100 mx-2">
                <div
                    className="absolute top-0 bottom-0 rounded-full bg-red-500"
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
                            className={`flex-1 py-1 text-[10px] font-medium transition-colors ${
                                inRange ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
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
