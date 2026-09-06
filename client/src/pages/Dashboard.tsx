import { useCallback, useEffect, useRef, useState } from 'react';
import Nav from '../components/Nav';
import IdleView from '../components/IdleView';
import SearchingView from '../components/SearchingView';
import MatchedView from '../components/MatchedView';
import MatchSidebar from '../components/MatchSidebar';
import StatusCard from '../components/StatusCard';
import ActionButton from '../components/ActionButton';
import { Ringtone } from '../audio/Ringtone';
import { WebRTCSession } from '../webrtc/WebRTCSession';
import type { CallConnectionState } from '../webrtc/WebRTCSession';
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
    const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
    const [pendingCallTo, setPendingCallTo] = useState<string | null>(null);
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

    const sendSignal = useCallback((targetUserId: string, type: string, payload: unknown = {}): boolean => {
        const socket = socketRef.current;
        if (socket?.readyState !== WebSocket.OPEN) {
            setMessage('Connection not ready — try again');
            return false;
        }
        socket.send(JSON.stringify({ targetUserId, type, payload }));
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

    const handleConnect = useCallback((userId: string) => {
        if (sendSignal(userId, 'call')) setPendingCallTo(userId);
    }, [sendSignal]);

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
                    case 'call':
                        // A matchmaking match auto-accepts the resulting direct call instead of
                        // showing the manual accept/reject card — both sides already opted in by queueing.
                        if (pendingMatchPeer === signal.fromUserId) {
                            sendSignal(signal.fromUserId, 'accept');
                            setPendingMatchPeer(null);
                        } else {
                            setIncomingCallFrom(signal.fromUserId);
                        }
                        break;
                    case 'accept':
                        if (pendingCallTo === signal.fromUserId) {
                            setMessage(`${signal.fromUserId} accepted your call`);
                            setPendingCallTo(null);
                            setActiveCallPeer(signal.fromUserId);
                            webrtcSessionRef.current?.startCall(signal.fromUserId);
                        }
                        break;
                    case 'reject':
                        if (pendingCallTo === signal.fromUserId) {
                            setMessage(`${signal.fromUserId} rejected your call`);
                            setPendingCallTo(null);
                        } else if (incomingCallFrom === signal.fromUserId) {
                            setMessage(`${signal.fromUserId} cancelled the call`);
                            setIncomingCallFrom(null);
                        }
                        break;
                    case 'webrtc-offer':
                        if (activeCallPeer) break;
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
                    case 'queue-matched': {
                        // Auto-advance into the real call handshake instead of waiting for a
                        // manual "Connect" click — both sides already opted in by queueing.
                        const { role } = signal.payload as { role: 'caller' | 'callee' };
                        setIsQueued(false);
                        if (role === 'caller') handleConnect(signal.fromUserId);
                        else setPendingMatchPeer(signal.fromUserId);
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
    }, [socketReady, pendingCallTo, activeCallPeer, incomingCallFrom, pendingMatchPeer, resetCallUi, sendSignal, handleConnect]);

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

    // Ring while an outgoing call is ringing OR an incoming call is waiting to be
    // answered. One effect (not two) so that when both are briefly true at once —
    // you are calling someone and simultaneously get called — a single owner
    // controls start/stop instead of one effect's cleanup silencing the other.
    useEffect(() => {
        const ringtone = ringtoneRef.current;
        if ((!pendingCallTo && !incomingCallFrom) || !ringtone) return;
        ringtone.start();
        return () => ringtone.stop();
    }, [pendingCallTo, incomingCallFrom]);

    useEffect(() => {
        return () => ringtoneRef.current?.stop();
    }, []);

    // Give up on an unanswered outgoing call after CALL_TIMEOUT_MS.
    useEffect(() => {
        if (!pendingCallTo) return;
        const timeoutId = window.setTimeout(() => {
            sendSignal(pendingCallTo, 'reject');
            setMessage(`No answer from ${pendingCallTo}`);
            setPendingCallTo(null);
        }, CALL_TIMEOUT_MS);
        return () => clearTimeout(timeoutId);
    }, [pendingCallTo, sendSignal]);

    // Drop an unanswered incoming call after CALL_TIMEOUT_MS; the caller times
    // out on their own side, so no signal is sent here.
    useEffect(() => {
        if (!incomingCallFrom) return;
        const timeoutId = window.setTimeout(() => {
            setIncomingCallFrom(null);
        }, CALL_TIMEOUT_MS);
        return () => clearTimeout(timeoutId);
    }, [incomingCallFrom]);

    // Give up waiting for the matched peer's call after CALL_TIMEOUT_MS, mirroring
    // the direct-call timeouts above so a stalled match can't hang the UI forever.
    useEffect(() => {
        if (!pendingMatchPeer) return;
        const timeoutId = window.setTimeout(() => {
            setPendingMatchPeer(null);
            setMessage('No connection from matched player — try again');
        }, CALL_TIMEOUT_MS);
        return () => clearTimeout(timeoutId);
    }, [pendingMatchPeer]);

    const handleJoinQueue = async (scope: 'any' | 'prefs', label: string) => {
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
        if (pendingCallTo) handleCancel();
    };

    const handleAccept = () => {
        if (incomingCallFrom && sendSignal(incomingCallFrom, 'accept')) {
            setMessage(`Call with ${incomingCallFrom} accepted`);
            setIncomingCallFrom(null);
        }
    };

    const handleReject = () => {
        if (!incomingCallFrom) return;
        sendSignal(incomingCallFrom, 'reject');
        setIncomingCallFrom(null);
    };

    const handleCancel = () => {
        if (!pendingCallTo) return;
        sendSignal(pendingCallTo, 'reject');
        setMessage(`Call to ${pendingCallTo} cancelled`);
        setPendingCallTo(null);
    };

    const handleHangUp = () => {
        if (activeCallPeer) sendSignal(activeCallPeer, 'webrtc-hangup');
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
        : (isQueued || pendingMatchPeer || pendingCallTo)
            ? 'searching'
            : 'idle';

    const searchingSubStatus = pendingMatchPeer
        ? 'Match found — waiting to connect...'
        : pendingCallTo
            ? `Calling ${pendingCallTo}...`
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
                        {incomingCallFrom && (
                            <StatusCard label="Incoming call">
                                <p className="mb-3">{incomingCallFrom} is calling you</p>
                                <div className="flex gap-3">
                                    <ActionButton onClick={handleAccept}>Accept</ActionButton>
                                    <ActionButton onClick={handleReject} variant="secondary">Reject</ActionButton>
                                </div>
                            </StatusCard>
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
