import type { IdentitySlice, PrintConfig } from '../../store/storeTypes';

interface PrintHeaderProps {
    identity: IdentitySlice['identity'];
    config: PrintConfig;
}

export function PrintHeader({ identity, config }: PrintHeaderProps) {
    const typeString = `${identity.type1 || ''}${
        identity.type2 && identity.type2.toLowerCase() !== 'none' ? ` / ${identity.type2}` : ''
    }`;

    return (
        <div className="print-sheet__header">
            <div className="print-sheet__field">
                <span className="print-sheet__field-label">Name:</span>
                <span className="print-sheet__field-val">{config.blankName ? '' : identity.nickname}</span>
            </div>
            <div className="print-sheet__field">
                <span className="print-sheet__field-label">Species:</span>
                <span className="print-sheet__field-val">{config.blankSpecies ? '' : identity.species}</span>
            </div>
            <div className="print-sheet__field">
                <span className="print-sheet__field-label">Rank:</span>
                <span className="print-sheet__field-val">{config.blankRank ? '' : identity.rank}</span>
            </div>
            <div className="print-sheet__field">
                <span className="print-sheet__field-label">Type:</span>
                <span className="print-sheet__field-val">{config.blankType ? '' : typeString}</span>
            </div>
            <div className="print-sheet__field">
                <span className="print-sheet__field-label">Nature:</span>
                <span className="print-sheet__field-val">{config.blankNature ? '' : identity.nature}</span>
            </div>
            <div className="print-sheet__field">
                <span className="print-sheet__field-label">{config.hideAge ? 'Gender:' : 'Age/Gender:'}</span>
                <span className="print-sheet__field-val">
                    {config.blankAgeGender
                        ? ''
                        : config.hideAge
                          ? identity.gender
                          : `${identity.age} ${identity.gender}`}
                </span>
            </div>
        </div>
    );
}
