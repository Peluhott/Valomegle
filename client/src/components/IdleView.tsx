import { useState } from 'react';
import RankSlider from './RankSlider';
import RegionChips from './RegionChips';
import ActionButton from './ActionButton';
import Card from './Card';
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
        <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-1.5">
                <h2 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Get matched with one player</h2>
                <p className="text-[14px] text-ink-2">Voice connects as soon as you're paired. Mic required, mute anytime.</p>
            </div>

            <div className="flex flex-col gap-4">
                <div className="border-[1.5px] border-accent rounded-card bg-[#fffafa] p-6 flex flex-col gap-3.5">
                    <div className="flex items-baseline justify-between">
                        <h3 className="text-[19px] font-semibold text-ink">Match with anybody</h3>
                        <span className="font-mono text-[11px] text-ink-3">~15s wait</span>
                    </div>
                    <p className="text-[14px] leading-[1.5] text-ink-2">
                        Pairs you with the next available player. No filters, fastest way into voice.
                    </p>
                    <ActionButton onClick={onQueueAny} variant="accent" fullWidth className="h-11 mt-1">
                        Queue now
                    </ActionButton>
                </div>

                <Card>
                    <div className="flex items-baseline justify-between">
                        <h3 className="text-[19px] font-semibold text-ink">Match by preferences</h3>
                        <span className="font-mono text-[11px] text-ink-3">{prefWait} wait</span>
                    </div>
                    <p className="text-[14px] leading-[1.5] text-ink-2">
                        Narrow by rank range and region before you queue. Longer wait, closer fit.
                    </p>

                    <div className="flex flex-col gap-5 border-t border-line-3 pt-5">
                        <RankSlider lo={lo} hi={hi} onChange={(l, h) => { setLo(l); setHi(h); }} />
                        <RegionChips picked={picked} onChange={setPicked} />

                        <div className="flex items-center gap-4">
                            <ActionButton onClick={queueWithPrefs} variant="outline" stretch={false} className="h-11 px-5">
                                Queue with preferences
                            </ActionButton>
                            <span className="font-mono text-[11px] text-ink-3">{matchCount} players match</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default IdleView;
