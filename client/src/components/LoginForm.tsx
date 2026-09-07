import React, { useState } from 'react';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

type LoginFormProps = {
    handleSwitchForm: () => void;
};

export default function LoginForm({ handleSwitchForm }: LoginFormProps) {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await apiClient.post('/api/users/login', { username, password });
            localStorage.setItem('token', response.data);
            navigate('/dashboard');
        } catch {
            setError('Invalid username or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-ink-2 mb-1">
                    Username
                </label>
                <input
                    type="text"
                    id="username"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas border border-line rounded-lg text-ink placeholder-ink-4 focus:outline-none focus:border-accent"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink-2 mb-1">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas border border-line rounded-lg text-ink placeholder-ink-4 focus:outline-none focus:border-accent"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-ink hover:opacity-[.9] disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
                {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <p className="text-center text-sm text-ink-3">
                Don't have an account?{' '}
                <button type="button" onClick={handleSwitchForm} className="text-ink-2 hover:text-ink underline">
                    Create one
                </button>
            </p>
        </form>
    );
}
