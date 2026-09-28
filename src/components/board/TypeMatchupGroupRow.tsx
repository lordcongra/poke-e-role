interface TypeMatchupGroupRowProps {
    label: string;
    types: string[];
    colors: Record<string, string>;
}

export function TypeMatchupGroupRow({ label, types, colors }: TypeMatchupGroupRowProps) {
    if (types.length === 0) return null;

    return (
        <div className="type-matchups__group-row">
            <span className="type-matchups__group-label text-label">{label}</span>
            <div className="type-matchups__pill-container">
                {types.map((t) => {
                    const bgColor = colors[t] || '#777';

                    return (
                        <span key={t} className="type-matchups__pill" style={{ background: bgColor }}>
                            {t}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
