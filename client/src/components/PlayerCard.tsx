type PlayerCardProps = {
    label: string;
    accent?: boolean;
};

const PlayerCard = ({ label, accent = false }: PlayerCardProps) => {
    return (
        <div
            className={`border border-line-2 rounded-card p-[22px] flex flex-col items-center gap-3.5 ${
                accent ? 'bg-subtle' : 'bg-surface'
            }`}
        >
            <div
                className={`w-16 h-16 rounded-full bg-line-3 border-2 ${accent ? 'border-accent' : 'border-line-2'}`}
            />
            <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-ink-4">{label}</span>
        </div>
    );
};

export default PlayerCard;
