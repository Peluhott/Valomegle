import ActionButton from '../components/ActionButton';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import { useFriends } from '../hooks/useFriends';
import { useRecentMatches } from '../hooks/useRecentMatches';

export default function History() {
    const { matches, loading } = useRecentMatches();
    const { statusFor, sendRequest } = useFriends();

    const rightRail = (
        <Card label="About this page" padding={20}>
            <p className="text-[12px] leading-[1.5] text-ink-3">
                Your last 10 voice duos, most recent first. Add someone here to keep playing with them later.
            </p>
        </Card>
    );

    if (loading) {
        return (
            <AppShell rightRail={rightRail}>
                <p className="text-[14px] text-ink-3">Loading…</p>
            </AppShell>
        );
    }

    return (
        <AppShell rightRail={rightRail}>
            <div className="flex flex-col gap-[30px]">
                <h2 className="text-[30px] font-bold tracking-[-.02em] text-ink">Past duos</h2>

                <Card label="Recent matches" padding={24}>
                    {matches.length === 0 ? (
                        <p className="text-[13px] text-ink-3">
                            No matches yet — find a duo to build your history.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {matches.map((match, index) => {
                                const status = statusFor(match.username);
                                return (
                                    <div
                                        key={`${match.username}-${match.matchedAt}-${index}`}
                                        className="flex items-center justify-between border border-line-3 rounded-tile px-4 py-3"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[14px] font-medium text-ink">
                                                {match.username}
                                            </span>
                                            <span className="font-mono text-[11px] text-ink-3">
                                                {new Date(match.matchedAt).toLocaleString()}
                                            </span>
                                        </div>
                                        {status === 'none' && (
                                            <ActionButton
                                                onClick={() => sendRequest(match.username)}
                                                variant="outline"
                                                stretch={false}
                                                className="h-8 px-4 text-[13px]"
                                            >
                                                Add friend
                                            </ActionButton>
                                        )}
                                        {status === 'pending-sent' && (
                                            <span className="font-mono text-[11px] tracking-[.08em] uppercase text-ink-4">
                                                Requested
                                            </span>
                                        )}
                                        {status === 'pending-received' && (
                                            <span className="font-mono text-[11px] tracking-[.08em] uppercase text-ink-4">
                                                Wants to be friends
                                            </span>
                                        )}
                                        {status === 'friends' && (
                                            <span className="font-mono text-[11px] tracking-[.08em] uppercase text-ink-3">
                                                Friends
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </AppShell>
    );
}
