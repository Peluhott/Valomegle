import { REGIONS } from '../constants';

type RegionChipsProps = {
    picked: string[];
    onChange: (picked: string[]) => void;
};

const RegionChips = ({ picked, onChange }: RegionChipsProps) => {
    const toggle = (name: string) => {
        onChange(picked.includes(name) ? picked.filter((r) => r !== name) : picked.concat(name));
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3">Region</span>
                {picked.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-[12px] text-ink-3 underline hover:text-ink"
                    >
                        Clear
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {REGIONS.map((name) => {
                    const on = picked.includes(name);
                    return (
                        <button
                            key={name}
                            type="button"
                            onClick={() => toggle(name)}
                            className={`rounded-[999px] px-3.5 py-[7px] text-[13px] font-medium border transition-colors ${
                                on
                                    ? 'bg-accent border-accent text-white'
                                    : 'bg-transparent border-line text-ink-2 hover:border-ink-4'
                            }`}
                        >
                            {name}
                        </button>
                    );
                })}
            </div>
            {picked.length === 0 && <span className="text-[12px] text-ink-3">All regions</span>}
        </div>
    );
};

export default RegionChips;
