import { useEffect, useState } from 'react';
import apiClient from '../api/client';

export type RecentMatchResponse = {
    username: string;
    matchedAt: string;
};

export function useRecentMatches() {
    const [matches, setMatches] = useState<RecentMatchResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        apiClient.get('/api/connections/recent')
            .then((res) => {
                if (cancelled) return;
                setMatches(res.data ?? []);
            })
            .catch(() => {
                if (!cancelled) setError('Failed to load recent matches.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return { matches, loading, error };
}
