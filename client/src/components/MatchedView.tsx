import type { CallConnectionState } from '../webrtc/WebRTCSession';
import PlayerCard from './PlayerCard';
import ActionButton from './ActionButton';
import Card from './Card';

type MatchedViewProps = {
    partnerId: string;
    callState: CallConnectionState | null;
    isMicMuted: boolean;
    onToggleMuteMe: () => void;
    isPeerAudioMuted: boolean;
    onToggleMuteThem: () => void;
    onSkip: () => void;
    onLeave: () => void;
};

const MatchedView = ({
    partnerId,
    callState,
    isMicMuted,
    onToggleMuteMe,
    isPeerAudioMuted,
    onToggleMuteThem,
    onSkip,
    onLeave,
}: MatchedViewProps) => {
    const connected = callState === 'connected';

    return (
        <div className="flex flex-col gap-5 w-full">
            <div className="flex items-end justify-between">
                <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-3">
                        Duo · voice {connected ? 'connected' : 'connecting'}
                    </span>
                    <h2 className="text-[30px] font-bold tracking-[-0.02em] text-ink">
                        {connected ? "You're paired up" : 'Connecting…'}
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <PlayerCard label="You" accent />
                <PlayerCard label={partnerId} />
            </div>

            <div className="flex items-center gap-3 border border-line-2 rounded-card p-4 bg-subtle">
                {isMicMuted ? (
                    // Muted state has no hover effect, unlike the `accent` variant (which adds
                    // hover:opacity-[.88]) — kept as a raw button to preserve that exact look.
                    <button
                        type="button"
                        onClick={onToggleMuteMe}
                        className="h-10 px-4 rounded-control bg-accent text-white text-sm font-semibold transition-colors"
                    >
                        Unmute me
                    </button>
                ) : (
                    <ActionButton onClick={onToggleMuteMe} variant="outline" stretch={false} className="h-10 px-4 text-sm">
                        Mute me
                    </ActionButton>
                )}
                <ActionButton onClick={onToggleMuteThem} variant="neutral" stretch={false} className="h-10 px-4 text-sm">
                    {isPeerAudioMuted ? 'Unmute them' : 'Mute them'}
                </ActionButton>
                <div className="flex-1" />
                <ActionButton onClick={onSkip} variant="neutral" stretch={false} className="h-10 px-4 text-sm">
                    Skip &amp; requeue
                </ActionButton>
                <ActionButton onClick={onLeave} variant="accent" stretch={false} className="h-10 px-4 text-sm">
                    Leave
                </ActionButton>
            </div>

            <Card label="Text backup" padding={20}>
                <div className="h-9 border border-line-2 rounded-control flex items-center px-3 text-[13px] text-ink-dis">
                    Chat coming soon
                </div>
            </Card>
        </div>
    );
};

export default MatchedView;
