import Panel from './Panel';

type PlayerCardProps = {
    label: string;
    accent?: boolean;
};

const PlayerCard = ({ label, accent = false }: PlayerCardProps) => {
    return (
        <Panel className="p-6 flex flex-col items-center gap-3">
            <div className={`w-16 h-16 rounded-full bg-neutral-200 border-2 ${accent ? 'border-red-500' : 'border-neutral-300'}`} />
            <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
        </Panel>
    );
};

export default PlayerCard;
