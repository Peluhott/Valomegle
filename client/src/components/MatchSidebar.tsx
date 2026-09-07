import { Link } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import Card from './Card';
import MicLevelMeter from './MicLevelMeter';

const MatchSidebar = () => {
    const { user, loading } = useCurrentUser();

    return (
        <div className="flex flex-col gap-5 w-full">
            <Card label="Your profile" padding={20}>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-line-3 border border-line" />
                    <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-medium text-ink">
                            {loading ? 'Loading…' : user?.username || 'Unknown'}
                        </span>
                        <span className="text-[13px] text-ink-3">{user?.rank || 'Rank not set'}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-2 text-[13px]">
                    <div className="flex justify-between">
                        <span className="text-ink-3">Rank</span>
                        <span className="font-medium text-ink">{user?.rank || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-ink-3">Region</span>
                        <span className="font-medium text-ink">{user?.region || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-ink-3">Duos played</span>
                        <span className="font-medium text-ink">—</span>
                    </div>
                </div>
                <Link
                    to="/profile"
                    className="h-8 border border-line rounded-control flex items-center justify-center text-[13px] font-medium text-ink hover:bg-inset transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                    Edit profile
                </Link>
            </Card>

            <Card padding={20}>
                <MicLevelMeter />
            </Card>

            <Card label="Recent duo" padding={20} dashed>
                <p className="text-[12px] leading-[1.5] text-ink-3">
                    Coming soon — duo history isn't tracked yet.
                </p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled
                        className="flex-1 h-8 rounded-control border border-line-2 text-[12px] text-ink-4 cursor-not-allowed"
                    >
                        Add friend
                    </button>
                    <button
                        type="button"
                        disabled
                        className="flex-1 h-8 rounded-control border border-line-2 text-[12px] text-ink-4 cursor-not-allowed"
                    >
                        Block
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default MatchSidebar;
