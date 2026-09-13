import ActionButton from '../components/ActionButton';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import { useFriends } from '../hooks/useFriends';

export default function Friends() {
    const { friends, incoming, outgoing, loading, accept, decline, unfriend } = useFriends();

    const rightRail = (
        <Card label="About this page" padding={20}>
            <p className="text-[12px] leading-[1.5] text-ink-3">
                Friends you've made from past duos. Accept or decline requests, or remove a friend.
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
                <h2 className="text-[30px] font-bold tracking-[-.02em] text-ink">Friends</h2>

                <Card label="Friends" padding={24}>
                    {friends.length === 0 ? (
                        <p className="text-[13px] text-ink-3">
                            No friends yet — add someone from your recent duos.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {friends.map((friend) => (
                                <div
                                    key={friend.id}
                                    className="flex items-center justify-between border border-line-3 rounded-tile px-4 py-3"
                                >
                                    <span className="text-[14px] font-medium text-ink">{friend.username}</span>
                                    <ActionButton
                                        onClick={() => unfriend(friend.id)}
                                        variant="neutral"
                                        stretch={false}
                                        className="h-8 px-4 text-[13px]"
                                    >
                                        Unfriend
                                    </ActionButton>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card label="Requests" padding={24}>
                    {incoming.length === 0 ? (
                        <p className="text-[13px] text-ink-3">No pending requests.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {incoming.map((request) => (
                                <div
                                    key={request.id}
                                    className="flex items-center justify-between border border-line-3 rounded-tile px-4 py-3"
                                >
                                    <span className="text-[14px] font-medium text-ink">
                                        {request.otherUsername}
                                    </span>
                                    <div className="flex gap-2">
                                        <ActionButton
                                            onClick={() => accept(request.id)}
                                            variant="accent"
                                            stretch={false}
                                            className="h-8 px-4 text-[13px]"
                                        >
                                            Accept
                                        </ActionButton>
                                        <ActionButton
                                            onClick={() => decline(request.id)}
                                            variant="neutral"
                                            stretch={false}
                                            className="h-8 px-4 text-[13px]"
                                        >
                                            Decline
                                        </ActionButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {outgoing.length > 0 && (
                        <div className="flex flex-col gap-2 border-t border-line-3 pt-4 mt-1">
                            <span className="font-mono text-[11px] tracking-[.14em] uppercase text-ink-3">
                                Requested — waiting on them
                            </span>
                            {outgoing.map((request) => (
                                <div key={request.id} className="flex items-center justify-between px-1 py-1">
                                    <span className="text-[13px] text-ink-2">{request.otherUsername}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </AppShell>
    );
}
