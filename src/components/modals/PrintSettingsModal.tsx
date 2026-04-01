import { useCharacterStore } from '../../store/useCharacterStore';
import './PrintSettingsModal.css';

interface PrintSettingsModalProps {
    onClose: () => void;
}

export function PrintSettingsModal({ onClose }: PrintSettingsModalProps) {
    const printConfig = useCharacterStore((state) => state.identity.printConfig);
    const setPrintConfig = useCharacterStore((state) => state.setPrintConfig);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const toggle = (field: keyof typeof printConfig) => {
        setPrintConfig({ [field]: !printConfig[field] });
    };

    const handlePrint = () => {
        setIdentity('isPrinting', true);
        onClose();
    };

    return (
        <div className="print-settings__overlay">
            <div className="print-settings__content print-settings__content--expanded">
                <div className="print-settings__header-row">
                    <h3 className="print-settings__title">🖨️ Print Settings</h3>
                    <button onClick={onClose} className="print-settings__close-x" title="Close">
                        X
                    </button>
                </div>
                <p className="print-settings__desc">Customize how your sheet will look on paper.</p>

                <div className="print-settings__grid">
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankName}
                            onChange={() => toggle('blankName')}
                            className="print-settings__checkbox"
                        />
                        Blank Name
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankSpecies}
                            onChange={() => toggle('blankSpecies')}
                            className="print-settings__checkbox"
                        />
                        Blank Species
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankType}
                            onChange={() => toggle('blankType')}
                            className="print-settings__checkbox"
                        />
                        Blank Type
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankNature}
                            onChange={() => toggle('blankNature')}
                            className="print-settings__checkbox"
                        />
                        Blank Nature
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankRank}
                            onChange={() => toggle('blankRank')}
                            className="print-settings__checkbox"
                        />
                        Blank Rank
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankAgeGender}
                            onChange={() => toggle('blankAgeGender')}
                            className="print-settings__checkbox"
                        />
                        Blank Age/Gender
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankStats}
                            onChange={() => toggle('blankStats')}
                            className="print-settings__checkbox"
                        />
                        Blank Core Stats
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankSocials}
                            onChange={() => toggle('blankSocials')}
                            className="print-settings__checkbox"
                        />
                        Blank Socials
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankSkills}
                            onChange={() => toggle('blankSkills')}
                            className="print-settings__checkbox"
                        />
                        Blank Skills
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankAbilities}
                            onChange={() => toggle('blankAbilities')}
                            className="print-settings__checkbox"
                        />
                        Blank Abilities
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.blankMoves}
                            onChange={() => toggle('blankMoves')}
                            className="print-settings__checkbox"
                        />
                        Blank Moves
                    </label>
                </div>

                <div className="print-settings__divider" />
                <p className="print-settings__desc print-settings__desc--sub">Visibility Options</p>

                <div className="print-settings__grid">
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.hideMoveDesc}
                            onChange={() => toggle('hideMoveDesc')}
                            className="print-settings__checkbox"
                        />
                        Hide Move Descriptions
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.hideKnowledgeSkills}
                            onChange={() => toggle('hideKnowledgeSkills')}
                            className="print-settings__checkbox"
                        />
                        Hide Knowledge Skills
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.hideCustomSkills}
                            onChange={() => toggle('hideCustomSkills')}
                            className="print-settings__checkbox"
                        />
                        Hide Custom Skills
                    </label>
                    <label className="print-settings__checkbox-label">
                        <input
                            type="checkbox"
                            checked={printConfig.hideAge}
                            onChange={() => toggle('hideAge')}
                            className="print-settings__checkbox"
                        />
                        Hide Age (Gender Only)
                    </label>
                    <label className="print-settings__checkbox-label" style={{ gridColumn: 'span 2' }}>
                        <input
                            type="checkbox"
                            checked={printConfig.coreSkillsOnly}
                            onChange={() => toggle('coreSkillsOnly')}
                            className="print-settings__checkbox"
                        />
                        Display Core 3 Skill Categories Only (Centered)
                    </label>
                    <label className="print-settings__checkbox-label" style={{ gridColumn: 'span 2' }}>
                        <input
                            type="checkbox"
                            checked={printConfig.showOnlyActiveAbility}
                            onChange={() => toggle('showOnlyActiveAbility')}
                            className="print-settings__checkbox"
                        />
                        Show Active Ability Only
                    </label>
                </div>

                <div className="print-settings__divider" />
                <p className="print-settings__desc print-settings__desc--sub">Display Styles</p>

                <div className="print-settings__dropdown-container">
                    <label className="print-settings__dropdown-label">Stat & Skill Format:</label>
                    <select
                        value={printConfig.statStyle || 'dots'}
                        onChange={(e) => setPrintConfig({ statStyle: e.target.value as 'dots' | 'numbers' | 'both' })}
                        className="print-settings__select"
                    >
                        <option value="dots">Dots Only</option>
                        <option value="numbers">Numbers Only</option>
                        <option value="both">Dots & Numbers</option>
                    </select>
                </div>

                <div className="print-settings__dropdown-container">
                    <label className="print-settings__dropdown-label">Ability Descriptions:</label>
                    <select
                        value={printConfig.abilityDescStyle || 'all'}
                        onChange={(e) =>
                            setPrintConfig({ abilityDescStyle: e.target.value as 'all' | 'selected' | 'none' })
                        }
                        className="print-settings__select"
                    >
                        <option value="all">Show All</option>
                        <option value="selected">Show Selected Only</option>
                        <option value="none">Hide All</option>
                    </select>
                </div>

                <div className="print-settings__actions">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="action-button action-button--dark print-settings__btn"
                    >
                        🖨️ Print Sheet
                    </button>
                </div>
            </div>
        </div>
    );
}
