import { useEffect, useState } from 'react';
import apiClient from '../api/client';

export type CurrentUser = {
    username: string;
    firstName: string | null;
    lastName: string | null;
    rank: string | null;
    region: string | null;
};

export function useCurrentUser() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        apiClient.get('/api/users/me')
            .then((res) => {
                if (cancelled) return;
                setUser({
                    username: res.data.username ?? '',
                    firstName: res.data.firstName ?? null,
                    lastName: res.data.lastName ?? null,
                    rank: res.data.rank ?? null,
                    region: res.data.region ?? null,
                });
            })
            .catch(() => {
                if (!cancelled) setError('Failed to load profile.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return { user, loading, error };
}
