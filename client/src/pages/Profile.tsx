import { useState } from 'react';
import apiClient from '../api/client';
import Nav from '../components/Nav';
import SideBar from '../components/SideBar';
import { RANKS, REGIONS } from '../constants';
import { useCurrentUser, type CurrentUser } from '../hooks/useCurrentUser';

export default function Profile() {
    const { user, loading, error: loadError } = useCurrentUser();
    const [seededUser, setSeededUser] = useState<CurrentUser | null>(null);
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [rank, setRank] = useState('');
    const [region, setRegion] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    if (user && user !== seededUser) {
        setSeededUser(user);
        setUsername(user.username ?? '');
        setFirstName(user.firstName ?? '');
        setLastName(user.lastName ?? '');
        setRank(user.rank ?? '');
        setRegion(user.region ?? '');
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaved(false);
        setSaving(true);
        try {
            const res = await apiClient.put('/api/users/me', {
                firstName: firstName || null,
                lastName: lastName || null,
                rank: rank || null,
                region: region || null,
            });
            setFirstName(res.data.firstName ?? '');
            setLastName(res.data.lastName ?? '');
            setRank(res.data.rank ?? '');
            setRegion(res.data.region ?? '');
            setSaved(true);
        } catch {
            setError('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-neutral-100">
            <Nav showLogout />

            <div className="flex flex-1 overflow-hidden">
                <SideBar />
                <main className="flex flex-1 items-center justify-center p-6">
                    <div className="bg-white rounded-xl p-8 shadow-lg w-full max-w-sm">
                        <h2 className="text-neutral-900 text-xl font-semibold mb-1">Profile</h2>
                        <p className="text-neutral-500 text-sm mb-6">{username}</p>

                        {loading ? (
                            <p className="text-neutral-500 text-sm">Loading...</p>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                {(error || loadError) && (
                                    <div className="px-3 py-2 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
                                        {error || loadError}
                                    </div>
                                )}
                                {saved && !error && !loadError && (
                                    <div className="px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-700 text-sm">
                                        Saved.
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-1">
                                        First name (optional)
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="First name"
                                        className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-1">
                                        Last name (optional)
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Last name"
                                        className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="rank" className="block text-sm font-medium text-neutral-700 mb-1">
                                        Rank
                                    </label>
                                    <select
                                        id="rank"
                                        value={rank}
                                        onChange={(e) => setRank(e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                                    >
                                        <option value="">Not set</option>
                                        {RANKS.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="region" className="block text-sm font-medium text-neutral-700 mb-1">
                                        Region
                                    </label>
                                    <select
                                        id="region"
                                        value={region}
                                        onChange={(e) => setRegion(e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                                    >
                                        <option value="">Not set</option>
                                        {REGIONS.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-2 px-4 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </form>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
