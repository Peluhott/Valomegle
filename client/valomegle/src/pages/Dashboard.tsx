import { useCallback, useEffect, useRef, useState } from 'react';
import Nav from '../components/Nav';
import SideBar from '../components/SideBar';
import Connect from '../components/Connect';
import { WebRTCSession } from '../webrtc/WebRTCSession';
import type { CallConnectionState } from '../webrtc/WebRTCSession';

interface SignalMessage {
    fromUserId: string;
    type: string;
    payload: unknown;
}

export default function Dashboard() {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [message, setMessage] = useState('');
    const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
    const [pendingCallTo, setPendingCallTo] = useState<string | null>(null);
    const [activeCallPeer, setActiveCallPeer] = useState<string | null>(null);
    const [callState, setCallState] = useState<CallConnectionState | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const webrtcSessionRef = useRef<WebRTCSession | null>(null);

    const sendSignal = useCallback((targetUserId: string, type: string, payload: unknown = {}) => {
        if (!socket) return;
        socket.send(JSON.stringify({ targetUserId, type, payload }));
    }, [socket]);

    const resetCallUi = useCallback(() => {
        webrtcSessionRef.current?.hangUp();
        setActiveCallPeer(null);
        setCallState(null);
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080';
        const ws = new WebSocket(`${wsBaseUrl}/ws?token=${token}`);

        ws.onopen = () => console.log('connected');
        ws.onclose = () => console.log('disconnected');

        setSocket(ws);

        return () => ws.close();
    }, []);

    useEffect(() => {
        if (!socket) return;

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
    }, [socket, pendingCallTo, activeCallPeer, resetCallUi]);

    useEffect(() => {
        if (!socket) return;

        const session = new WebRTCSession({
            onSendSignal: sendSignal,
            onConnectionStateChange: setCallState,
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
    }, [socket, sendSignal]);

    const handleConnect = (userId: string) => {
        if (socket) {
            sendSignal(userId, 'call');
            setPendingCallTo(userId);
        }
    };

    const handleAccept = () => {
        if (socket && incomingCallFrom) {
            sendSignal(incomingCallFrom, 'accept');
            setMessage(`Call with ${incomingCallFrom} accepted`);
            setIncomingCallFrom(null);
        }
    };

    const handleReject = () => {
        if (socket && incomingCallFrom) {
            sendSignal(incomingCallFrom, 'reject');
            setIncomingCallFrom(null);
        }
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
                            Calling {pendingCallTo}...
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
