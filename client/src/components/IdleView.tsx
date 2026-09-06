import { useState } from 'react';
import RankSlider from './RankSlider';
import RegionChips from './RegionChips';
import ActionButton from './ActionButton';
import Panel from './Panel';
import { REGIONS, rankRangeLabel } from '../constants';

type IdleViewProps = {
    onQueueAny: () => void;
    onQueueWithPrefs: (label: string) => void;
};

const IdleView = ({ onQueueAny, onQueueWithPrefs }: IdleViewProps) => {
    const [lo, setLo] = useState(2);
    const [hi, setHi] = useState(4);
    const [picked, setPicked] = useState<string[]>([]);

    const breadth = hi - lo + 1;
    const regionCount = picked.length || REGIONS.length;
    const matchCount = Math.max(4, Math.round(breadth * regionCount * 7.3));
    const prefWait = matchCount > 200 ? '~30s' : matchCount > 90 ? '~1–2m' : '~3–5m';

    const queueWithPrefs = () => {
        const rankLabel = rankRangeLabel(lo, hi);
        const regionLabel = picked.length ? picked.join(', ') : 'All regions';
        onQueueWithPrefs(`${rankLabel} • ${regionLabel}`);
    };

    return (
        <div className="flex flex-col gap-4 w-full max-w-xl">
            <Panel accent="red" className="p-6 flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold text-neutral-900">Match with anybody</h2>
                    <span className="text-xs text-neutral-500">~15s wait</span>
                </div>
                <p className="text-sm text-neutral-500">Pairs you with the next available player. No filters, fastest way into voice.</p>
                <ActionButton onClick={onQueueAny} variant="accent" fullWidth className="h-11 mt-1">
                    Queue now
                </ActionButton>
            </Panel>

            <Panel className="p-6 flex flex-col gap-4">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold text-neutral-900">Match by preferences</h2>
                    <span className="text-xs text-neutral-500">{prefWait} wait</span>
                </div>
                <p className="text-sm text-neutral-500">Narrow by rank range and region before you queue. Longer wait, closer fit.</p>

                <div className="flex flex-col gap-4 border-t border-neutral-200 pt-4">
                    <RankSlider lo={lo} hi={hi} onChange={(l, h) => { setLo(l); setHi(h); }} />
                    <RegionChips picked={picked} onChange={setPicked} />

                    <div className="flex items-center gap-4">
                        <ActionButton onClick={queueWithPrefs} variant="outline" stretch={false} className="h-11 px-5">
                            Queue with preferences
                        </ActionButton>
                        <span className="text-xs text-neutral-500">{matchCount} players match</span>
                    </div>
                </div>
            </Panel>
        </div>
    );
};

export default IdleView;
