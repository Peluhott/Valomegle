import AppShell from '../components/AppShell';
import IdleView from '../components/IdleView';
import SearchingView from '../components/SearchingView';
import MatchedView from '../components/MatchedView';
import MatchSidebar from '../components/MatchSidebar';
import StatusCard from '../components/StatusCard';
import { useCall } from '../context/CallContext';

export default function Dashboard() {
    const {
        phase,
        message,
        activeCallPeer,
        callState,
        isQueued,
        queueInfo,
        pendingMatchPeer,
        searchTimedOut,
        isMicMuted,
        isPeerAudioMuted,
        joinQueue,
        leaveQueue,
        cancelSearch,
        widen,
        hangUp,
        toggleMuteMe,
        toggleMuteThem,
    } = useCall();

    const handleSkipAndRequeue = () => {
        hangUp();
        void joinQueue(queueInfo?.scope ?? 'any', queueInfo?.label || 'Anybody');
    };

    // queueInfo isn't touched by hangUp() itself (it's independent of the active
    // call), so clear it explicitly — leaveQueue() is best-effort/idempotent even
    // when we weren't actually queued (already matched, isQueued is false).
    const handleLeaveMatch = () => {
        hangUp();
        void leaveQueue();
    };

    const searchingSubStatus = pendingMatchPeer
        ? 'Match found — waiting to connect...'
        : searchTimedOut
            ? queueInfo?.scope === 'prefs'
                ? 'Taking a while — try widening to anybody'
                : 'Taking a while — hang tight'
            : undefined;

    return (
        <AppShell rightRail={<MatchSidebar />}>
            <div className="flex flex-col gap-4">
                {phase === 'idle' && (
                    <IdleView
                        onQueueAny={() => joinQueue('any', 'Anybody')}
                        onQueueWithPrefs={(prefs, label) => joinQueue('prefs', label, prefs)}
                    />
                )}
                {phase === 'searching' && (
                    <SearchingView
                        scopeLabel={queueInfo?.label || (pendingMatchPeer ?? 'Anybody')}
                        subStatus={searchingSubStatus}
                        canWiden={isQueued && queueInfo?.scope === 'prefs'}
                        onCancel={cancelSearch}
                        onWiden={widen}
                    />
                )}
                {phase === 'matched' && activeCallPeer && (
                    <MatchedView
                        partnerId={activeCallPeer}
                        callState={callState}
                        isMicMuted={isMicMuted}
                        onToggleMuteMe={toggleMuteMe}
                        isPeerAudioMuted={isPeerAudioMuted}
                        onToggleMuteThem={toggleMuteThem}
                        onSkip={handleSkipAndRequeue}
                        onLeave={handleLeaveMatch}
                    />
                )}
                {message && <StatusCard label="Status">{message}</StatusCard>}
            </div>
        </AppShell>
    );
}
