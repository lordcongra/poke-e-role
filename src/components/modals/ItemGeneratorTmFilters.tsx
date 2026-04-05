import './ItemGeneratorModal.css';

interface ItemGeneratorTmFiltersProps {
    tmPowers: string[];
    setTmPowers: (powers: string[] | ((prev: string[]) => string[])) => void;
    tmTypes: string[];
    setTmTypes: (types: string[] | ((prev: string[]) => string[])) => void;
    allTypes: string[];
    allTypeColors: Record<string, string>;
}

export function ItemGeneratorTmFilters({
    tmPowers,
    setTmPowers,
    tmTypes,
    setTmTypes,
    allTypes,
    allTypeColors
}: ItemGeneratorTmFiltersProps) {
    const hasBasic = ['1', '2', '3'].every((p) => tmPowers.includes(p));
    const hasHigh = ['4', '5', '6', '7', '8', '10'].every((p) => tmPowers.includes(p));

    const toggleBasicPowers = () => {
        if (hasBasic) {
            setTmPowers((prev) => prev.filter((p) => !['1', '2', '3'].includes(p)));
        } else {
            setTmPowers((prev) => Array.from(new Set([...prev, '1', '2', '3'])));
        }
    };

    const toggleHighPowers = () => {
        if (hasHigh) {
            setTmPowers((prev) => prev.filter((p) => !['4', '5', '6', '7', '8', '10'].includes(p)));
        } else {
            setTmPowers((prev) => Array.from(new Set([...prev, '4', '5', '6', '7', '8', '10'])));
        }
    };

    const toggleSupport = () => {
        if (tmPowers.includes('support')) {
            setTmPowers((prev) => prev.filter((p) => p !== 'support'));
        } else {
            setTmPowers((prev) => [...prev, 'support']);
        }
    };

    const handlePowerDropdown = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const val = event.target.value;
        if (val && !tmPowers.includes(val)) {
            setTmPowers((prev) => [...prev, val]);
        }
    };

    const removePowerPill = (powerToRemove: string) => {
        setTmPowers((prev) => prev.filter((p) => p !== powerToRemove));
    };

    const toggleAnyType = () => {
        if (tmTypes.includes('Any')) {
            setTmTypes([]);
        } else {
            setTmTypes(['Any']);
        }
    };

    const handleTypeDropdown = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const val = event.target.value;
        if (val) {
            setTmTypes((prev) => {
                const next = prev.filter((t) => t !== 'Any');
                if (!next.includes(val)) return [...next, val];
                return next;
            });
        }
    };

    const removeTypePill = (typeToRemove: string) => {
        setTmTypes((prev) => {
            const next = prev.filter((t) => t !== typeToRemove);
            if (next.length === 0) return ['Any'];
            return next;
        });
    };

    return (
        <div className="item-generator-modal__filter-group">
            <div className="item-generator-modal__filter-group-title">Technical Machines</div>

            <span className="item-generator-modal__type-label">TM Powers:</span>

            <div className="item-generator-modal__checkbox-list" style={{ marginBottom: '10px', paddingLeft: '5px' }}>
                <label className="item-generator-modal__checkbox-label">
                    <input
                        type="checkbox"
                        className="item-generator-modal__checkbox"
                        checked={tmPowers.includes('support')}
                        onChange={toggleSupport}
                    />
                    Support Moves (Power 0)
                </label>
                <label className="item-generator-modal__checkbox-label">
                    <input
                        type="checkbox"
                        className="item-generator-modal__checkbox"
                        checked={hasBasic}
                        onChange={toggleBasicPowers}
                    />
                    Basic Moves (Power 1-3)
                </label>
                <label className="item-generator-modal__checkbox-label">
                    <input
                        type="checkbox"
                        className="item-generator-modal__checkbox"
                        checked={hasHigh}
                        onChange={toggleHighPowers}
                    />
                    High Power Moves (Power 4+)
                </label>
            </div>

            <div className="item-generator-modal__dropdown-row">
                <select className="item-generator-modal__type-select" value="" onChange={handlePowerDropdown}>
                    <option value="" disabled>
                        + Add Specific Power...
                    </option>
                    {!tmPowers.includes('support') && <option value="support">Support</option>}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10].map(
                        (power) =>
                            !tmPowers.includes(String(power)) && (
                                <option key={`opt_pow_${power}`} value={String(power)}>
                                    Power {power}
                                </option>
                            )
                    )}
                </select>
            </div>

            <div className="item-generator-modal__pill-container">
                {tmPowers.map((power) => (
                    <span key={power} className="item-generator-modal__pill" onClick={() => removePowerPill(power)}>
                        {power === 'support' ? 'Support' : `Power ${power}`} x
                    </span>
                ))}
            </div>

            <span className="item-generator-modal__type-label">TM Types:</span>

            <div className="item-generator-modal__checkbox-list" style={{ marginBottom: '10px', paddingLeft: '5px' }}>
                <label className="item-generator-modal__checkbox-label">
                    <input
                        type="checkbox"
                        className="item-generator-modal__checkbox"
                        checked={tmTypes.includes('Any')}
                        onChange={toggleAnyType}
                    />
                    Any Type (Select All)
                </label>
            </div>

            <div className="item-generator-modal__dropdown-row">
                <select className="item-generator-modal__type-select" value="" onChange={handleTypeDropdown}>
                    <option value="" disabled>
                        + Add Specific Type...
                    </option>
                    {allTypes.map(
                        (type) =>
                            !tmTypes.includes(type) && (
                                <option key={`opt_type_${type}`} value={type}>
                                    {type}
                                </option>
                            )
                    )}
                </select>
            </div>

            <div className="item-generator-modal__pill-container">
                {tmTypes
                    .filter((t) => t !== 'Any')
                    .map((type) => (
                        <span
                            key={type}
                            className="item-generator-modal__pill"
                            style={{
                                background: allTypeColors[type] || 'var(--dark)',
                                color: 'white',
                                textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                borderColor: 'transparent'
                            }}
                            onClick={() => removeTypePill(type)}
                        >
                            {type} x
                        </span>
                    ))}
            </div>
        </div>
    );
}
