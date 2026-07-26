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
        <div className="bg-neutral-900 rounded-xl p-8 shadow-lg w-full max-w-sm">
            <h2 className="text-white text-xl font-semibold mb-6">Find someone</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label htmlFor="userId" className="block text-sm font-medium text-neutral-300 mb-1">
                        User ID
                    </label>
                    <input
                        type="text"
                        id="userId"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Enter a user ID"
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!userId.trim()}
                    className="w-full py-2 px-4 bg-white hover:bg-neutral-200 disabled:bg-neutral-700 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
                >
                    Connect
                </button>
            </form>
        </div>
    );
};

export default Connect;
