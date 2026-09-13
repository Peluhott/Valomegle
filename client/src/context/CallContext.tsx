import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import axios from 'axios';
import { Ringtone } from '../audio/Ringtone';
import { WebRTCSession } from '../webrtc/WebRTCSession';
import type { CallConnectionState } from '../webrtc/WebRTCSession';
import { ensureMicAccess } from '../webrtc/mic';
import apiClient from '../api/client';
import type { QueuePreferences } from '../constants';

interface SignalMessage {
    fromUserId: string;
    type: string;
    payload: unknown;
}

export type QueueInfo = { scope: 'any' | 'prefs'; label: string };
export type IncomingInvite = { fromUsername: string };
export type OutgoingInvite = { targetUsername: string };

export type CallPhase = 'idle' | 'searching' | 'matched' | 'ringing-in' | 'ringing-out';

export interface CallContextValue {
    // connection
    socketReady: boolean;
    message: string;

    // derived UI phase — the single value pages should switch on
    phase: CallPhase;

    // matchmaking-queue state
    isQueued: boolean;
    queueInfo: QueueInfo | null;
    pendingMatchPeer: string | null;

    // active/in-progress call state (matchmaking or direct)
    activeCallPeer: string | null;
    callState: CallConnectionState | null;
    isMicMuted: boolean;
    isPeerAudioMuted: boolean;

    // direct-call invite state
    incomingInvite: IncomingInvite | null;
    outgoingInvite: OutgoingInvite | null;

    // matchmaking-queue actions
    joinQueue: (scope: 'any' | 'prefs', label: string, prefs?: QueuePreferences) => Promise<void>;
    leaveQueue: () => Promise<void>;
    widen: () => void;
    cancelSearch: () => void;

    // in-call actions
    hangUp: () => void;
    toggleMuteMe: () => void;
    toggleMuteThem: () => void;

    // direct-call actions
    callFriend: (targetUsername: string) => Promise<void>;
    acceptInvite: () => Promise<void>;
    declineInvite: () => Promise<void>;
    cancelOutgoingInvite: () => Promise<void>;
}

const CALL_TIMEOUT_MS = 30000;

const CallContext = createContext<CallContextValue | null>(null);

// Reads an axios error's response body — the backend returns plain-text error
// messages (see MatchmakingExceptionHandler-style `ResponseEntity<String>`
// bodies) — falling back to a generic message when there isn't one to show.
function extractErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err) && typeof err.response?.data === 'string' && err.response.data) {
        return err.response.data;
    }
    return fallback;
}

export function CallProvider({ children }: { children: ReactNode }) {
    const [socketReady, setSocketReady] = useState(false);
    const [message, setMessage] = useState('');
    const [activeCallPeer, setActiveCallPeer] = useState<string | null>(null);
    const [callState, setCallState] = useState<CallConnectionState | null>(null);
    const [isQueued, setIsQueued] = useState(false);
    const [pendingMatchPeer, setPendingMatchPeer] = useState<string | null>(null);
    const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isPeerAudioMuted, setIsPeerAudioMuted] = useState(false);
    const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);
    const [outgoingInvite, setOutgoingInvite] = useState<OutgoingInvite | null>(null);

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
                        setIncomingInvite(null);
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
                    case 'call-invite': {
                        // Someone is calling me directly — ring until I accept/decline.
                        if (activeCallPeer || incomingInvite) break;
                        const { fromUsername } = signal.payload as { fromUsername: string };
                        setIncomingInvite({ fromUsername });
                        break;
                    }
                    case 'call-accepted':
                        // Mirrors queue-matched's caller path: the callee accepted my
                        // invite, so I kick off the WebRTC offer.
                        setOutgoingInvite(null);
                        setActiveCallPeer(signal.fromUserId);
                        webrtcSessionRef.current?.startCall(signal.fromUserId);
                        break;
                    case 'call-declined':
                        setOutgoingInvite(null);
                        setMessage(`${signal.fromUserId} declined the call`);
                        break;
                    case 'call-cancelled':
                        setIncomingInvite(null);
                        setMessage(`${signal.fromUserId} cancelled the call`);
                        break;
                    default:
                        setMessage(`${signal.type} from ${signal.fromUserId}`);
                }
            } catch {
                console.error('received non-JSON frame:', event.data);
            }
        };

        socket.addEventListener('message', handleMessage);
        return () => socket.removeEventListener('message', handleMessage);
    }, [socketReady, activeCallPeer, pendingMatchPeer, incomingInvite, resetCallUi]);

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

    // Ring while waiting for a matched/accepted peer to connect (after
    // queue-matched or acceptInvite, before their webrtc-offer arrives) and while
    // an incoming direct-call invite hasn't been answered yet. The two never
    // overlap in practice, so one shared ringtone instance covers both.
    useEffect(() => {
        const ringtone = ringtoneRef.current;
        if ((!pendingMatchPeer && !incomingInvite) || !ringtone) return;
        ringtone.start();
        return () => ringtone.stop();
    }, [pendingMatchPeer, incomingInvite]);

    useEffect(() => {
        return () => ringtoneRef.current?.stop();
    }, []);

    // Give up waiting for the matched/accepted peer's call after CALL_TIMEOUT_MS
    // so a stalled match can't hang the UI forever.
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

    // Shared join implementation — joinQueue() gates this behind phase === 'idle',
    // but widen() intentionally calls it directly while already queued: it
    // rejoins with no preferences, replacing the old preference-scoped ticket
    // (join() de-dupes by username, so no explicit leave() is needed first).
    const performJoin = async (scope: 'any' | 'prefs', label: string, prefs?: QueuePreferences) => {
        const gate = await ensureMicAccess();
        if (!gate.ok) {
            setMessage(gate.message);
            return;
        }

        try {
            await apiClient.post('/api/matchmaking/join', prefs);
            setIsQueued(true);
            setQueueInfo({ scope, label });
        } catch {
            setMessage('Failed to join queue');
        }
    };

    const phase: CallPhase = activeCallPeer
        ? 'matched'
        : incomingInvite
            ? 'ringing-in'
            : outgoingInvite
                ? 'ringing-out'
                : (isQueued || pendingMatchPeer)
                    ? 'searching'
                    : 'idle';

    const joinQueue = async (scope: 'any' | 'prefs', label: string, prefs?: QueuePreferences) => {
        if (phase !== 'idle') return;
        await performJoin(scope, label, prefs);
    };

    const leaveQueue = async () => {
        try {
            await apiClient.post('/api/matchmaking/leave');
        } catch {
            // best-effort — the user is leaving the UI state regardless
        } finally {
            setIsQueued(false);
            setQueueInfo(null);
        }
    };

    const widen = () => {
        void performJoin('any', 'Anybody');
    };

    const cancelSearch = () => {
        if (isQueued) void leaveQueue();
        if (pendingMatchPeer) setPendingMatchPeer(null);
    };

    const hangUp = () => {
        if (activeCallPeer) sendSignal('webrtc-hangup');
        resetCallUi();
    };

    const toggleMuteMe = () => {
        const next = !isMicMuted;
        webrtcSessionRef.current?.setMicMuted(next);
        setIsMicMuted(next);
    };

    const toggleMuteThem = () => {
        const next = !isPeerAudioMuted;
        if (remoteAudioRef.current) remoteAudioRef.current.muted = next;
        setIsPeerAudioMuted(next);
    };

    const callFriend = async (targetUsername: string) => {
        if (phase !== 'idle') return;

        const gate = await ensureMicAccess();
        if (!gate.ok) {
            setMessage(gate.message);
            return;
        }

        try {
            await apiClient.post('/api/calls/invite', { targetUsername });
            setOutgoingInvite({ targetUsername });
        } catch (err) {
            setMessage(extractErrorMessage(err, 'Failed to call — try again'));
        }
    };

    const acceptInvite = async () => {
        if (!incomingInvite) return;

        const gate = await ensureMicAccess();
        if (!gate.ok) {
            setMessage(gate.message);
            return;
        }

        const fromUsername = incomingInvite.fromUsername;
        try {
            await apiClient.post('/api/calls/accept');
            setIncomingInvite(null);
            // Same limbo as the matchmaking callee: wait for the caller's
            // webrtc-offer to actually start the WebRTC handshake.
            setPendingMatchPeer(fromUsername);
        } catch (err) {
            setMessage(extractErrorMessage(err, 'Failed to accept call — try again'));
        }
    };

    const declineInvite = async () => {
        if (!incomingInvite) return;

        try {
            await apiClient.post('/api/calls/decline');
        } catch {
            // best-effort — the user is leaving the UI state regardless
        } finally {
            setIncomingInvite(null);
        }
    };

    const cancelOutgoingInvite = async () => {
        if (!outgoingInvite) return;

        try {
            await apiClient.post('/api/calls/cancel');
        } catch {
            // best-effort — the user is leaving the UI state regardless
        } finally {
            setOutgoingInvite(null);
        }
    };

    const value: CallContextValue = {
        socketReady,
        message,
        phase,
        isQueued,
        queueInfo,
        pendingMatchPeer,
        activeCallPeer,
        callState,
        isMicMuted,
        isPeerAudioMuted,
        incomingInvite,
        outgoingInvite,
        joinQueue,
        leaveQueue,
        widen,
        cancelSearch,
        hangUp,
        toggleMuteMe,
        toggleMuteThem,
        callFriend,
        acceptInvite,
        declineInvite,
        cancelOutgoingInvite,
    };

    return (
        <CallContext.Provider value={value}>
            {children}
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
        </CallContext.Provider>
    );
}

// Context + its hook belong in one file; this only costs a full reload instead
// of a fast refresh when this file itself changes.
// eslint-disable-next-line react-refresh/only-export-components
export function useCall(): CallContextValue {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error('useCall must be used within a CallProvider');
    return ctx;
}
