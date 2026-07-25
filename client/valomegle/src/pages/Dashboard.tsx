import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import SideBar from '../components/SideBar';
import Connect from '../components/Connect';

export default function Dashboard() {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        const ws = new WebSocket(`ws://localhost:8080/ws?token=${token}`);

        ws.onopen = () => console.log('connected');
        ws.onmessage = (event) => setMessage(event.data);
        ws.onclose = () => console.log('disconnected');

        setSocket(ws);

        return () => ws.close();
    }, []);

    const handleConnect = (userId: string) => {
        if (socket) {
            socket.send(JSON.stringify({
                targetUserId: userId,
                message: 'poke!'
            }));
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900">
            <Nav showLogout />

            <div className="flex flex-1 overflow-hidden">
                <SideBar />
                <main className="flex flex-col flex-1 items-center justify-center gap-4 p-6">
                    <Connect handleConnect={handleConnect} />
                    {message && (
                        <div className="w-full max-w-sm px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm">
                            <span className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Incoming</span>
                            {message}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
