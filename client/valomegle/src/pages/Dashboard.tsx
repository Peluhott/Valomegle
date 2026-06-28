import { useEffect, useState } from 'react';

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

    const sendPoke = () => {
        if (socket) {
            socket.send(JSON.stringify({
                targetUserId: 'peluhot', // replace with a real userId to test
                message: 'poke!'
            }));
        }
    }

    return (
        <div>
            <h1>Dashboard</h1>
            <button onClick={sendPoke}>Poke User</button>
            {message && <p>You got a poke from someone!</p>}
        </div>
    )
}