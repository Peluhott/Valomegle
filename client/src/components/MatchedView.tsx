import type { CallConnectionState } from '../webrtc/WebRTCSession';
import PlayerCard from './PlayerCard';
import ActionButton from './ActionButton';
import Panel from './Panel';

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
        <div className="flex flex-col gap-5 w-full max-w-xl">
            <div className="flex items-end justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-neutral-500">Duo · voice {connected ? 'connected' : 'connecting'}</span>
                    <h2 className="text-2xl font-bold text-neutral-900">{connected ? "You're paired up" : 'Connecting…'}</h2>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <PlayerCard label="You" accent />
                <PlayerCard label={partnerId} />
            </div>

            <Panel className="flex items-center gap-3 p-4">
                {isMicMuted ? (
                    // Muted state has no hover effect, unlike the `accent` variant (which adds
                    // hover:bg-red-500) — kept as a raw button to preserve that exact look.
                    <button
                        type="button"
                        onClick={onToggleMuteMe}
                        className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold transition-colors"
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
            </Panel>

            <Panel label="Text backup" className="p-5 flex flex-col gap-3">
                <div className="h-9 border border-neutral-200 rounded-lg flex items-center px-3 text-sm text-neutral-400">
                    Chat coming soon
                </div>
            </Panel>
        </div>
    );
};

export default MatchedView;
