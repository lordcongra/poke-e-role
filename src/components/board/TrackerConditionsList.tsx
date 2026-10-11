interface ConditionItem {
    id: string;
    label: string;
    bg: string;
    text: string;
}

interface TrackerConditionsListProps {
    conditions: ConditionItem[];
}

export function TrackerConditionsList({ conditions }: TrackerConditionsListProps) {
    return (
        <div className="tracker-section__conditions-container">
            <span className="tracker-section__conditions-label text-label">Conditions:</span>
            <div className="tracker-section__conditions-list">
                {conditions.length === 0 ? (
                    <span className="tracker-section__conditions-empty text-subtext">None</span>
                ) : (
                    conditions.map((c) => (
                        <span
                            key={c.id}
                            className="tracker-section__condition-pill"
                            style={{ background: c.bg, color: c.text }}
                        >
                            {c.label}
                        </span>
                    ))
                )}
            </div>
        </div>
    );
}
