import { useCurrentUser } from '../hooks/useCurrentUser';
import MicLevelMeter from './MicLevelMeter';
import Panel from './Panel';

const MatchSidebar = () => {
    const { user, loading } = useCurrentUser();

    return (
        <div className="flex flex-col gap-4 w-80 shrink-0">
            <Panel label="Your profile" className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 border border-neutral-300" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-neutral-900">{loading ? 'Loading…' : user?.username || 'Unknown'}</span>
                        <span className="text-xs text-neutral-500">{user?.rank || 'Rank not set'}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-neutral-500">Rank</span><span className="text-neutral-900">{user?.rank || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-500">Region</span><span className="text-neutral-900">{user?.region || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-500">Duos played</span><span className="text-neutral-900">—</span></div>
                </div>
            </Panel>

            <Panel label="Mic check" className="p-5 flex flex-col gap-3">
                <MicLevelMeter />
            </Panel>

            <Panel label="Recent duo" accent="dashed" className="p-5 flex flex-col gap-2">
                <p className="text-xs text-neutral-400">Coming soon — duo history isn't tracked yet.</p>
                <div className="flex gap-2 mt-1">
                    <button type="button" disabled className="flex-1 h-8 rounded-lg border border-neutral-200 text-xs text-neutral-400 cursor-not-allowed">
                        Add friend
                    </button>
                    <button type="button" disabled className="flex-1 h-8 rounded-lg border border-neutral-200 text-xs text-neutral-400 cursor-not-allowed">
                        Block
                    </button>
                </div>
            </Panel>
        </div>
    );
};

export default MatchSidebar;
