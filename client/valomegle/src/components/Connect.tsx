import { useState } from 'react';

type ConnectProps = {
    handleConnect: (userId: string) => void;
};

const Connect = ({ handleConnect }: ConnectProps) => {
    const [userId, setUserId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userId.trim()) handleConnect(userId.trim());
    };

    return (
        <div className="bg-slate-800 rounded-xl p-8 shadow-lg w-full max-w-sm">
            <h2 className="text-white text-xl font-semibold mb-6">Find someone</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label htmlFor="userId" className="block text-sm font-medium text-slate-300 mb-1">
                        User ID
                    </label>
                    <input
                        type="text"
                        id="userId"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Enter a user ID"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!userId.trim()}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                    Connect
                </button>
            </form>
        </div>
    );
};

export default Connect;
