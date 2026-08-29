import { useCallback, useEffect, useRef, useState } from 'react';
import Nav from '../components/Nav';
import SideBar from '../components/SideBar';
import Connect from '../components/Connect';
import { Ringtone } from '../audio/Ringtone';
import { WebRTCSession } from '../webrtc/WebRTCSession';
import type { CallConnectionState } from '../webrtc/WebRTCSession';

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
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
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
        const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080';
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
                        setIncomingCallFrom(signal.fromUserId);
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
                    default:
                        setMessage(`${signal.type} from ${signal.fromUserId}`);
                }
            } catch {
                console.error('received non-JSON frame:', event.data);
            }
        };

        socket.addEventListener('message', handleMessage);
        return () => socket.removeEventListener('message', handleMessage);
    }, [socketReady, pendingCallTo, activeCallPeer, incomingCallFrom, resetCallUi]);

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

    const handleConnect = (userId: string) => {
        if (sendSignal(userId, 'call')) setPendingCallTo(userId);
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

    return (
        <div className="flex flex-col h-screen bg-neutral-950">
            <Nav showLogout />

            <div className="flex flex-1 overflow-hidden">
                <SideBar />
                <main className="flex flex-col flex-1 items-center justify-center gap-4 p-6">
                    <Connect handleConnect={handleConnect} />
                    {incomingCallFrom && (
                        <div className="w-full max-w-sm px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 text-sm">
                            <span className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">Incoming call</span>
                            <p className="mb-3">{incomingCallFrom} is calling you</p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleAccept}
                                    className="flex-1 py-2 px-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg transition-colors"
                                >
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReject}
                                    className="flex-1 py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    )}
                    {pendingCallTo && (
                        <div className="w-full max-w-sm px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 text-sm">
                            <p className="mb-3">Calling {pendingCallTo}...</p>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="w-full py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    {activeCallPeer && (
                        <div className="w-full max-w-sm px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 text-sm">
                            <span className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">In call</span>
                            <p className="mb-3">In call with {activeCallPeer} — {callState}</p>
                            <button
                                type="button"
                                onClick={handleHangUp}
                                className="w-full py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                Hang Up
                            </button>
                        </div>
                    )}
                    {message && (
                        <div className="w-full max-w-sm px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 text-sm">
                            <span className="text-neutral-400 text-xs uppercase tracking-wide block mb-1">Status</span>
                            {message}
                        </div>
                    )}
                </main>
            </div>
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
        </div>
    );
}
