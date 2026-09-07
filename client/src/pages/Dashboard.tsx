import { useCallback, useEffect, useRef, useState } from 'react';
import Nav from '../components/Nav';
import IdleView from '../components/IdleView';
import SearchingView from '../components/SearchingView';
import MatchedView from '../components/MatchedView';
import MatchSidebar from '../components/MatchSidebar';
import StatusCard from '../components/StatusCard';
import { Ringtone } from '../audio/Ringtone';
import { WebRTCSession } from '../webrtc/WebRTCSession';
import type { CallConnectionState } from '../webrtc/WebRTCSession';
import { ensureMicAccess } from '../webrtc/mic';
import apiClient from '../api/client';

interface SignalMessage {
    fromUserId: string;
    type: string;
    payload: unknown;
}

const CALL_TIMEOUT_MS = 30000;

export default function Dashboard() {
    const [socketReady, setSocketReady] = useState(false);
    const [message, setMessage] = useState('');
    const [activeCallPeer, setActiveCallPeer] = useState<string | null>(null);
    const [callState, setCallState] = useState<CallConnectionState | null>(null);
    const [isQueued, setIsQueued] = useState(false);
    const [pendingMatchPeer, setPendingMatchPeer] = useState<string | null>(null);
    const [queueInfo, setQueueInfo] = useState<{ scope: 'any' | 'prefs'; label: string } | null>(null);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isPeerAudioMuted, setIsPeerAudioMuted] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const webrtcSessionRef = useRef<WebRTCSession | null>(null);
    const activeCallPeerRef = useRef<string | null>(null);
    const isTearingDownRef = useRef(false);
    const ringtoneRef = useRef<Ringtone | null>(null);
    if (ringtoneRef.current === null) ringtoneRef.current = new Ringtone();

    useEffect(() => {
        activeCallPeerRef.current = activeCallPeer;
    }, [activeCallPeer]);

    const sendSignal = useCallback((type: string, payload: unknown = {}): boolean => {
        const socket = socketRef.current;
        if (socket?.readyState !== WebSocket.OPEN) {
            setMessage('Connection not ready — try again');
            return false;
        }
        socket.send(JSON.stringify({ type, payload }));
        return true;
    }, []);

    const resetCallUi = useCallback(() => {
        // hangUp() synchronously echoes onConnectionStateChange("disconnected");
        // the flag tells that handler this teardown is already in progress.
        isTearingDownRef.current = true;
        webrtcSessionRef.current?.hangUp();
        isTearingDownRef.current = false;

        setActiveCallPeer(null);
        setCallState(null);
        setIsMicMuted(false);
        setIsPeerAudioMuted(false);
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
            remoteAudioRef.current.muted = false;
        }
    }, []);

    const handleConnectionStateChange = useCallback((state: CallConnectionState) => {
        setCallState(state);

        if (state !== 'disconnected' && state !== 'failed') return;
        if (isTearingDownRef.current || !activeCallPeerRef.current) return;

        setMessage(state === 'failed' ? 'Call failed — connection lost' : 'Call ended');
        resetCallUi();
    }, [resetCallUi]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const wsBaseUrl = window.__APP_CONFIG__?.WS_BASE_URL || import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080';
        const ws = new WebSocket(`${wsBaseUrl}/ws?token=${token}`);
        socketRef.current = ws;
        let unmounted = false;

        ws.onopen = () => setSocketReady(true);
        ws.onclose = () => {
            setSocketReady(false);
            if (socketRef.current === ws) socketRef.current = null;
            if (!unmounted) setMessage('Connection closed — please refresh');
        };

        return () => {
            unmounted = true;
            setSocketReady(false);
            socketRef.current = null;
            ws.close();
        };
    }, []);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !socketReady) return;

        const handleMessage = (event: MessageEvent) => {
            try {
                const signal: SignalMessage = JSON.parse(event.data);
                switch (signal.type) {
                    case 'webrtc-offer':
                        if (activeCallPeer) break;
                        setPendingMatchPeer(null);
                        setActiveCallPeer(signal.fromUserId);
                        webrtcSessionRef.current?.answerCall(signal.fromUserId, signal.payload as RTCSessionDescriptionInit);
                        break;
                    case 'webrtc-answer':
                        webrtcSessionRef.current?.handleAnswer(signal.fromUserId, signal.payload as RTCSessionDescriptionInit);
                        break;
                    case 'webrtc-ice-candidate':
                        webrtcSessionRef.current?.handleIceCandidate(signal.fromUserId, signal.payload as RTCIceCandidateInit);
                        break;
                    case 'webrtc-hangup':
                        if (signal.fromUserId !== activeCallPeer) break;
                        setMessage(`${signal.fromUserId} ended the call`);
                        resetCallUi();
                        break;
                    case 'peer-disconnected':
                        setMessage('Your partner disconnected');
                        setPendingMatchPeer(null);
                        resetCallUi();
                        break;
                    case 'error':
                        // Only react if a call is actually in progress — a stray frame
                        // (e.g. trickled ICE arriving after the server already unpaired
                        // on a normal hang-up) would otherwise show a false error.
                        console.error('server error frame:', signal.payload);
                        if (!activeCallPeer && !pendingMatchPeer) break;
                        setMessage('Lost connection to your match — try again');
                        setPendingMatchPeer(null);
                        resetCallUi();
                        break;
                    case 'queue-matched': {
                        // Both sides already opted in by queueing, so advance straight into the
                        // WebRTC handshake: the caller kicks off the offer, the callee waits for it.
                        const { role } = signal.payload as { role: 'caller' | 'callee' };
                        setIsQueued(false);
                        if (role === 'caller') {
                            setActiveCallPeer(signal.fromUserId);
                            webrtcSessionRef.current?.startCall(signal.fromUserId);
                        } else {
                            setPendingMatchPeer(signal.fromUserId);
                        }
                        break;
                    }
                    default:
                        setMessage(`${signal.type} from ${signal.fromUserId}`);
                }
            } catch {
                console.error('received non-JSON frame:', event.data);
            }
        };

        socket.addEventListener('message', handleMessage);
        return () => socket.removeEventListener('message', handleMessage);
    }, [socketReady, activeCallPeer, pendingMatchPeer, resetCallUi]);

    useEffect(() => {
        if (!socketReady) return;

        const session = new WebRTCSession({
            onSendSignal: sendSignal,
            onConnectionStateChange: handleConnectionStateChange,
            onRemoteStream: (stream) => {
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = stream;
                    remoteAudioRef.current.play().catch((err) => setMessage(`Playback error: ${err.message}`));
                }
            },
            onError: (err) => setMessage(err.message),
        });
        webrtcSessionRef.current = session;

        return () => {
            session.hangUp();
            webrtcSessionRef.current = null;
        };
    }, [socketReady, sendSignal, handleConnectionStateChange]);

    // Ring while waiting for a matched peer to connect (the callee side, after
    // queue-matched and before their webrtc-offer arrives).
    useEffect(() => {
        const ringtone = ringtoneRef.current;
        if (!pendingMatchPeer || !ringtone) return;
        ringtone.start();
        return () => ringtone.stop();
    }, [pendingMatchPeer]);

    useEffect(() => {
        return () => ringtoneRef.current?.stop();
    }, []);

    // Give up waiting for the matched peer's call after CALL_TIMEOUT_MS so a
    // stalled match can't hang the UI forever.
    useEffect(() => {
        if (!pendingMatchPeer) return;
        const timeoutId = window.setTimeout(() => {
            setPendingMatchPeer(null);
            setMessage('No connection from matched player — try again');
        }, CALL_TIMEOUT_MS);
        return () => clearTimeout(timeoutId);
    }, [pendingMatchPeer]);

    // Tear down a call that never reaches "connected" (dropped offer, silent ICE
    // stall, offline peer) so it can't hang the UI. handleConnectionStateChange
    // covers the case where the pc actually reports failed/disconnected.
    useEffect(() => {
        if (!activeCallPeer || callState === 'connected') return;
        const timeoutId = window.setTimeout(() => {
            setMessage('Call failed to connect — try again');
            if (activeCallPeer) sendSignal('webrtc-hangup');
            resetCallUi();
        }, CALL_TIMEOUT_MS);
        return () => clearTimeout(timeoutId);
    }, [activeCallPeer, callState, sendSignal, resetCallUi]);

    const handleJoinQueue = async (scope: 'any' | 'prefs', label: string) => {
        const gate = await ensureMicAccess();
        if (!gate.ok) {
            setMessage(gate.message);
            return;
        }

        try {
            await apiClient.post('/api/matchmaking/join');
            setIsQueued(true);
            setQueueInfo({ scope, label });
        } catch {
            setMessage('Failed to join queue');
        }
    };

    const handleLeaveQueue = async () => {
        try {
            await apiClient.post('/api/matchmaking/leave');
        } catch {
            // best-effort — the user is leaving the UI state regardless
        } finally {
            setIsQueued(false);
            setQueueInfo(null);
        }
    };

    // Preferences aren't sent to the backend today — the queue is a plain FIFO
    // with no rank/region filtering — so "widen" only corrects the displayed
    // label; the user was already matching against anybody.
    const handleWiden = () => {
        setQueueInfo({ scope: 'any', label: 'Anybody' });
    };

    const handleCancelSearch = () => {
        if (isQueued) handleLeaveQueue();
        if (pendingMatchPeer) setPendingMatchPeer(null);
    };

    const handleHangUp = () => {
        if (activeCallPeer) sendSignal('webrtc-hangup');
        resetCallUi();
    };

    const handleLeaveMatch = () => {
        handleHangUp();
        setQueueInfo(null);
    };

    const handleSkipAndRequeue = () => {
        handleHangUp();
        void handleJoinQueue(queueInfo?.scope ?? 'any', queueInfo?.label || 'Anybody');
    };

    const handleToggleMuteMe = () => {
        const next = !isMicMuted;
        webrtcSessionRef.current?.setMicMuted(next);
        setIsMicMuted(next);
    };

    const handleToggleMuteThem = () => {
        const next = !isPeerAudioMuted;
        if (remoteAudioRef.current) remoteAudioRef.current.muted = next;
        setIsPeerAudioMuted(next);
    };

    const phase: 'idle' | 'searching' | 'matched' = activeCallPeer
        ? 'matched'
        : (isQueued || pendingMatchPeer)
            ? 'searching'
            : 'idle';

    const searchingSubStatus = pendingMatchPeer
        ? 'Match found — waiting to connect...'
        : undefined;

    return (
        <div className="flex flex-col h-screen bg-neutral-100">
            <Nav showLogout />

            <div className="flex flex-1 overflow-hidden">
                <main className="flex flex-1 gap-8 p-8 overflow-auto items-start justify-center">
                    <div className="flex-1 flex flex-col items-center gap-4">
                        {phase === 'idle' && (
                            <IdleView
                                onQueueAny={() => handleJoinQueue('any', 'Anybody')}
                                onQueueWithPrefs={(label) => handleJoinQueue('prefs', label)}
                            />
                        )}
                        {phase === 'searching' && (
                            <SearchingView
                                scopeLabel={queueInfo?.label || 'Anybody'}
                                subStatus={searchingSubStatus}
                                canWiden={isQueued && queueInfo?.scope === 'prefs'}
                                onCancel={handleCancelSearch}
                                onWiden={handleWiden}
                            />
                        )}
                        {phase === 'matched' && activeCallPeer && (
                            <MatchedView
                                partnerId={activeCallPeer}
                                callState={callState}
                                isMicMuted={isMicMuted}
                                onToggleMuteMe={handleToggleMuteMe}
                                isPeerAudioMuted={isPeerAudioMuted}
                                onToggleMuteThem={handleToggleMuteThem}
                                onSkip={handleSkipAndRequeue}
                                onLeave={handleLeaveMatch}
                            />
                        )}
                        {message && <StatusCard label="Status">{message}</StatusCard>}
                    </div>
                    <MatchSidebar />
                </main>
            </div>
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
        </div>
    );
}
