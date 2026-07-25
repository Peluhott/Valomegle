import React, { useState } from 'react';
import axios from 'axios';
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
            const response = await axios.post('http://localhost:8080/api/users/login', { username, password });
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
                <div className="px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                    {error}
                </div>
            )}
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
                    Username
                </label>
                <input
                    type="text"
                    id="username"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
                {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <p className="text-center text-sm text-slate-400">
                Don't have an account?{' '}
                <button type="button" onClick={handleSwitchForm} className="text-indigo-400 hover:text-indigo-300 underline">
                    Create one
                </button>
            </p>
        </form>
    );
}
