import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';

export type FriendResponse = {
    id: number;
    username: string;
};

export type FriendRequestResponse = {
    id: number;
    otherUsername: string;
    createdAt: string;
};

export type FriendStatus = 'friends' | 'pending-sent' | 'pending-received' | 'none';

// Centralizes friend/request state so both the History and Friends pages (and
// the dashboard sidebar) can ask "what's my relationship with user X" without
// each duplicating the three fetches + mutation calls.
export function useFriends() {
    const [friends, setFriends] = useState<FriendResponse[]>([]);
    const [incoming, setIncoming] = useState<FriendRequestResponse[]>([]);
    const [outgoing, setOutgoing] = useState<FriendRequestResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refresh = useCallback(async () => {
        try {
            const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
                apiClient.get('/api/friends'),
                apiClient.get('/api/friends/requests/incoming'),
                apiClient.get('/api/friends/requests/outgoing'),
            ]);
            setFriends(friendsRes.data ?? []);
            setIncoming(incomingRes.data ?? []);
            setOutgoing(outgoingRes.data ?? []);
            setError('');
        } catch {
            setError('Failed to load friends.');
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await refresh();
            if (!cancelled) setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [refresh]);

    const sendRequest = useCallback(
        async (username: string) => {
            await apiClient.post('/api/friends/requests', { username });
            await refresh();
        },
        [refresh],
    );

    const accept = useCallback(
        async (id: number) => {
            await apiClient.post(`/api/friends/requests/${id}/accept`);
            await refresh();
        },
        [refresh],
    );

    const decline = useCallback(
        async (id: number) => {
            await apiClient.post(`/api/friends/requests/${id}/decline`);
            await refresh();
        },
        [refresh],
    );

    const unfriend = useCallback(
        async (id: number) => {
            await apiClient.delete(`/api/friends/${id}`);
            await refresh();
        },
        [refresh],
    );

    const statusFor = useCallback(
        (username: string): FriendStatus => {
            if (friends.some((f) => f.username === username)) return 'friends';
            if (outgoing.some((r) => r.otherUsername === username)) return 'pending-sent';
            if (incoming.some((r) => r.otherUsername === username)) return 'pending-received';
            return 'none';
        },
        [friends, incoming, outgoing],
    );

    return { friends, incoming, outgoing, loading, error, refresh, sendRequest, accept, decline, unfriend, statusFor };
}
