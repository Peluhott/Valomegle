import { useEffect, useState } from 'react';
import RankSlider from './RankSlider';
import RegionChips from './RegionChips';
import ActionButton from './ActionButton';
import apiClient from '../api/client';
import { RANKS, rankRangeLabel, type QueuePreferences } from '../constants';

const optionCard = 'border-[1.5px] border-accent rounded-card bg-[#fffafa] p-6 flex flex-col gap-3.5';

type IdleViewProps = {
    onQueueAny: () => void;
    onQueueWithPrefs: (prefs: QueuePreferences, label: string) => void;
};

async function getMatchCount(prefs: QueuePreferences): Promise<number> {
    const response = await apiClient.post<{ count: number }>('/api/matchmaking/match-count', prefs);
    return response.data.count;
}

const IdleView = ({ onQueueAny, onQueueWithPrefs }: IdleViewProps) => {
    const [lo, setLo] = useState(2);
    const [hi, setHi] = useState(4);
    const [picked, setPicked] = useState<string[]>([]);
    const [matchCount, setMatchCount] = useState<number | null>(null);

    useEffect(() => {
        const prefs: QueuePreferences = { rankLo: RANKS[lo], rankHi: RANKS[hi], regions: picked };
        const timeoutId = window.setTimeout(() => {
            getMatchCount(prefs)
                .then(setMatchCount)
                .catch(() => setMatchCount(null));
        }, 300);
        return () => window.clearTimeout(timeoutId);
    }, [lo, hi, picked]);

    const queueWithPrefs = () => {
        const rankLabel = rankRangeLabel(lo, hi);
        const regionLabel = picked.length ? picked.join(', ') : 'All regions';
        onQueueWithPrefs({ rankLo: RANKS[lo], rankHi: RANKS[hi], regions: picked }, `${rankLabel} • ${regionLabel}`);
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-1.5">
                <h2 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Get matched with one player</h2>
                <p className="text-[14px] text-ink-2">Voice connects as soon as you're paired. Mic required, mute anytime.</p>
            </div>

            <div className="flex flex-col gap-4">
                <div className={optionCard}>
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

                <div className={optionCard}>
                    <div className="flex items-baseline justify-between">
                        <h3 className="text-[19px] font-semibold text-ink">Match by preferences</h3>
                        {matchCount !== null && (
                            <span className="font-mono text-[11px] text-ink-3">
                                {matchCount === 0 ? 'No matches right now' : `${matchCount} match${matchCount === 1 ? '' : 'es'} now`}
                            </span>
                        )}
                    </div>
                    <p className="text-[14px] leading-[1.5] text-ink-2">
                        Narrow by rank range and region before you queue. Longer wait, closer fit.
                    </p>

                    <div className="flex flex-col gap-5 border-t border-line-3 pt-5">
                        <RankSlider lo={lo} hi={hi} onChange={(l, h) => { setLo(l); setHi(h); }} />
                        <RegionChips picked={picked} onChange={setPicked} />

                        <ActionButton onClick={queueWithPrefs} variant="accent" fullWidth className="h-11 mt-1">
                            Queue with preferences
                        </ActionButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdleView;
