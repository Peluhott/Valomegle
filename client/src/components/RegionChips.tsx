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
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-neutral-500">Region</span>
                {picked.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-xs text-neutral-500 underline hover:text-neutral-700"
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
                            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                                on
                                    ? 'bg-red-600 border-red-600 text-white'
                                    : 'bg-transparent border-neutral-300 text-neutral-700 hover:border-neutral-400'
                            }`}
                        >
                            {name}
                        </button>
                    );
                })}
            </div>
            {picked.length === 0 && <span className="text-xs text-neutral-500">All regions</span>}
        </div>
    );
};

export default RegionChips;
