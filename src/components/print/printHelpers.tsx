export function renderStatValue(
    filled: number,
    limit: number,
    isBlank: boolean,
    statStyle: 'dots' | 'numbers' | 'both'
) {
    const val = isBlank ? '' : filled;

    let dotsNode = null;
    if (statStyle === 'dots' || statStyle === 'both') {
        const dots = [];
        for (let i = 0; i < limit; i++) {
            dots.push(i < filled && !isBlank ? '●' : '○');
        }
        dotsNode = <span className="print-sheet__dots">{dots.join('')}</span>;
    }

    let numNode = null;
    if (statStyle === 'numbers' || statStyle === 'both') {
        numNode = <span className="print-sheet__number">{val}</span>;
    }

    return (
        <div className="print-sheet__stat-value-container">
            {dotsNode}
            {numNode}
        </div>
    );
}

export function renderStat(
    label: string,
    filled: number,
    limit: number,
    isBlank: boolean,
    statStyle: 'dots' | 'numbers' | 'both'
) {
    return (
        <div className="print-sheet__stat-row">
            <span className="print-sheet__stat-name">{label}</span>
            {renderStatValue(filled, limit, isBlank, statStyle)}
        </div>
    );
}

export function renderSkill(label: string, filled: number, isBlank: boolean, statStyle: 'dots' | 'numbers' | 'both') {
    return (
        <div className="print-sheet__stat-row">
            <span className="print-sheet__stat-name" style={{ width: '65px', fontSize: '0.75rem' }}>
                {label}
            </span>
            {renderStatValue(filled, 5, isBlank, statStyle)}
        </div>
    );
}
