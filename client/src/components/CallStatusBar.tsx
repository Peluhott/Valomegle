import type { ReactNode } from 'react';
import { useCall } from '../context/CallContext';
import ActionButton from './ActionButton';

// Compact controls shared by every phase — sized down from ActionButton's
// default (py-2 px-4) so the strip stays thin.
const controlProps = { stretch: false, className: 'h-8 px-3 text-[13px]' } as const;

// Persistent strip docked under the main nav so a search/ringing/call stays
// visible (and controllable) while the user browses other pages — a compact
// mirror of SearchingView/MatchedView's controls, not a replacement for them.
const CallStatusBar = () => {
    const {
        phase,
        message,
        queueInfo,
        pendingMatchPeer,
        activeCallPeer,
        callState,
        isMicMuted,
        isPeerAudioMuted,
        incomingInvite,
        outgoingInvite,
        cancelSearch,
        hangUp,
        toggleMuteMe,
        toggleMuteThem,
        acceptInvite,
        declineInvite,
        cancelOutgoingInvite,
    } = useCall();

    if (phase === 'idle') return null;

    let statusText = '';
    let controls: ReactNode = null;

    switch (phase) {
        case 'searching':
            statusText = queueInfo?.label || 'Searching for a match...';
            controls = (
                <ActionButton onClick={cancelSearch} variant="neutral" {...controlProps}>
                    Cancel
                </ActionButton>
            );
            break;
        case 'ringing-out':
            statusText = `Calling ${outgoingInvite?.targetUsername}...`;
            controls = (
                <ActionButton onClick={cancelOutgoingInvite} variant="neutral" {...controlProps}>
                    Cancel
                </ActionButton>
            );
            break;
        case 'ringing-in':
            statusText = `Incoming call from ${incomingInvite?.fromUsername}`;
            controls = (
                <div className="flex items-center gap-2">
                    <ActionButton onClick={declineInvite} variant="neutral" {...controlProps}>
                        Decline
                    </ActionButton>
                    <ActionButton onClick={acceptInvite} variant="accent" {...controlProps}>
                        Accept
                    </ActionButton>
                </div>
            );
            break;
        case 'matched': {
            // Mirrors MatchedView's own connected/connecting distinction — the peer
            // can briefly be pendingMatchPeer if activeCallPeer hasn't landed yet.
            const peer = activeCallPeer ?? pendingMatchPeer;
            const connected = callState === 'connected';
            statusText = `In call with ${peer} · voice ${connected ? 'connected' : 'connecting'}`;
            controls = (
                <div className="flex items-center gap-2">
                    <ActionButton onClick={toggleMuteMe} variant={isMicMuted ? 'accent' : 'outline'} {...controlProps}>
                        {isMicMuted ? 'Unmute me' : 'Mute me'}
                    </ActionButton>
                    <ActionButton onClick={toggleMuteThem} variant="neutral" {...controlProps}>
                        {isPeerAudioMuted ? 'Unmute them' : 'Mute them'}
                    </ActionButton>
                    <ActionButton onClick={hangUp} variant="accent" {...controlProps}>
                        Hang up
                    </ActionButton>
                </div>
            );
            break;
        }
    }

    return (
        <div className="flex items-center justify-between gap-4 px-8 py-2.5 border-b border-line-3 bg-subtle">
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-[13px] text-ink font-medium truncate">{statusText}</span>
                {message && <span className="text-[13px] text-ink-3 truncate">· {message}</span>}
            </div>
            {controls}
        </div>
    );
};

export default CallStatusBar;
