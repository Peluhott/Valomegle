import { useMicLevel } from '../hooks/useMicLevel';

const BAR_COUNT = 5;

const MicLevelMeter = () => {
    const { level, status } = useMicLevel();

    if (status === 'denied' || status === 'error') {
        return (
            <p className="text-xs text-neutral-500">
                {status === 'denied' ? 'Mic permission denied — enable it to queue.' : 'Could not read mic input.'}
            </p>
        );
    }

    return (
        <div className="flex items-end gap-1 h-8">
            {Array.from({ length: BAR_COUNT }, (_, i) => {
                const threshold = (i + 1) / BAR_COUNT;
                const active = status === 'granted' && level >= threshold - 1 / BAR_COUNT / 2;
                return (
                    <div
                        key={i}
                        className={`w-1.5 rounded-sm transition-colors ${active ? 'bg-red-500' : 'bg-neutral-200'}`}
                        style={{ height: `${30 + i * 15}%` }}
                    />
                );
            })}
        </div>
    );
};

export default MicLevelMeter;
