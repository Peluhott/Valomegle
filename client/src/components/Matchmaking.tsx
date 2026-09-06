type MatchmakingProps = {
    isQueued: boolean;
    onJoinQueue: () => void;
    onLeaveQueue: () => void;
};

const Matchmaking = ({ isQueued, onJoinQueue, onLeaveQueue }: MatchmakingProps) => {
    return (
        <div className="bg-neutral-900 rounded-xl p-8 shadow-lg w-full max-w-sm">
            <h2 className="text-white text-xl font-semibold mb-6">Random match</h2>
            {isQueued ? (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-neutral-300">Waiting for a match...</p>
                    <button
                        type="button"
                        onClick={onLeaveQueue}
                        className="w-full py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg transition-colors"
                    >
                        Leave Queue
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onJoinQueue}
                    className="w-full py-2 px-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg transition-colors"
                >
                    Join Queue
                </button>
            )}
        </div>
    );
};

export default Matchmaking;
