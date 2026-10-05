import { Printer, X } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { PrintConfig } from '../../../store/storeTypes';
import './PrintSettingsModal.css';

interface PrintSettingsModalProps {
    onClose: () => void;
}

interface ToggleOption {
    key: keyof PrintConfig;
    label: string;
    fullWidth?: boolean;
}

const SECTION_VISIBILITY_OPTIONS: ToggleOption[] = [
    { key: 'hidePortrait', label: 'Hide Portrait' },
    { key: 'hideCoreStats', label: 'Hide Core Stats' },
    { key: 'hideSocialStats', label: 'Hide Social Stats' },
    { key: 'hideCombatVitals', label: 'Hide Combat Vitals' },
    { key: 'hideSkills', label: 'Hide Skills' },
    { key: 'hideAbilities', label: 'Hide Abilities' },
    { key: 'hideMoves', label: 'Hide Moves' },
    { key: 'hideItems', label: 'Hide Items' },
    { key: 'hidePassives', label: 'Hide Passives' },
    { key: 'hideNotes', label: 'Hide Notes' },
    { key: 'autoHideEmptySections', label: 'Auto-hide Empty Sections', fullWidth: true }
];

const CONTENT_VISIBILITY_OPTIONS: ToggleOption[] = [
    { key: 'hideMoveDesc', label: 'Hide Move Descriptions' },
    { key: 'hideKnowledgeSkills', label: 'Hide Knowledge Skills' },
    { key: 'hideCustomSkills', label: 'Hide Custom Skills' },
    { key: 'hideAge', label: 'Hide Age (Gender Only)' },
    { key: 'showOnlyActiveAbility', label: 'Show Active Ability Only' },
    { key: 'compactMode', label: 'Compact Layout (Fit More on Page 1)', fullWidth: true },
    { key: 'coreSkillsOnly', label: 'Display Core 3 Skill Categories Only (Centered)', fullWidth: true }
];

const BLANK_FIELD_OPTIONS: ToggleOption[] = [
    { key: 'blankName', label: 'Blank Name' },
    { key: 'blankSpecies', label: 'Blank Species' },
    { key: 'blankType', label: 'Blank Type' },
    { key: 'blankNature', label: 'Blank Nature' },
    { key: 'blankRank', label: 'Blank Rank' },
    { key: 'blankAgeGender', label: 'Blank Age/Gender' },
    { key: 'blankStats', label: 'Blank Core Stats' },
    { key: 'blankSocials', label: 'Blank Socials' },
    { key: 'blankSkills', label: 'Blank Skills' },
    { key: 'blankAbilities', label: 'Blank Abilities' },
    { key: 'blankMoves', label: 'Blank Moves' },
    { key: 'blankItems', label: 'Blank Items' },
    { key: 'blankPassives', label: 'Blank Passives' }
];

export function PrintSettingsModal({ onClose }: PrintSettingsModalProps) {
    const printConfig = useCharacterStore((state) => state.identity.printConfig);
    const setPrintConfig = useCharacterStore((state) => state.setPrintConfig);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const toggle = (field: keyof PrintConfig) => {
        setPrintConfig({ [field]: !printConfig[field] });
    };

    const handlePrint = () => {
        setIdentity('isPrinting', true);
        onClose();
    };

    const renderToggleGrid = (options: ToggleOption[]) => (
        <div className="print-settings__grid">
            {options.map(({ key, label, fullWidth }) => (
                <label
                    key={key}
                    className={`print-settings__checkbox-label text-subtext ${fullWidth ? 'print-settings__checkbox-label--full' : ''}`}
                    style={{ color: 'var(--text-main)' }}
                >
                    <input
                        type="checkbox"
                        checked={Boolean(printConfig[key])}
                        onChange={() => toggle(key)}
                        className="print-settings__checkbox"
                    />
                    {label}
                </label>
            ))}
        </div>
    );

    return (
        <div className="print-settings__overlay">
            <div className="print-settings__content print-settings__content--expanded">
                <div className="print-settings__header-row">
                    <h3 className="print-settings__title modal-title-with-icon text-title-primary">
                        <Printer size={20} /> Print Settings
                    </h3>
                    <button onClick={onClose} className="print-settings__close-x text-subtext" title="Close">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>
                <p className="print-settings__desc text-subtext">Customize how your sheet will look on paper.</p>

                {/* Section Visibility */}
                <p className="print-settings__desc print-settings__desc--sub text-label">Section Visibility (Hide)</p>
                {renderToggleGrid(SECTION_VISIBILITY_OPTIONS)}

                {/* Content Options */}
                <div className="print-settings__divider" />
                <p className="print-settings__desc print-settings__desc--sub text-label">Content Options</p>
                {renderToggleGrid(CONTENT_VISIBILITY_OPTIONS)}

                {/* Blank Fields for Hand-filling */}
                <div className="print-settings__divider" />
                <p className="print-settings__desc print-settings__desc--sub text-label">
                    Blank Fields (For Pencil Writing)
                </p>
                {renderToggleGrid(BLANK_FIELD_OPTIONS)}

                {/* Display Styles */}
                <div className="print-settings__divider" />
                <p className="print-settings__desc print-settings__desc--sub text-label">Display Styles</p>

                <div className="print-settings__dropdowns-wrapper">
                    <div className="print-settings__dropdown-container">
                        <label className="print-settings__dropdown-label text-label">Stat Format:</label>
                        <select
                            value={printConfig.statStyle || 'dots'}
                            onChange={(e) =>
                                setPrintConfig({ statStyle: e.target.value as 'dots' | 'numbers' | 'both' })
                            }
                            className="print-settings__select text-subtext"
                            style={{ color: 'var(--text-main)' }}
                        >
                            <option value="dots">Dots Only</option>
                            <option value="numbers">Numbers Only</option>
                            <option value="both">Dots & Nums</option>
                        </select>
                    </div>

                    <div className="print-settings__dropdown-container">
                        <label className="print-settings__dropdown-label text-label">Ability Desc:</label>
                        <select
                            value={printConfig.abilityDescStyle || 'all'}
                            onChange={(e) =>
                                setPrintConfig({ abilityDescStyle: e.target.value as 'all' | 'selected' | 'none' })
                            }
                            className="print-settings__select text-subtext"
                            style={{ color: 'var(--text-main)' }}
                        >
                            <option value="all">Show All</option>
                            <option value="selected">Active Only</option>
                            <option value="none">Hide All</option>
                        </select>
                    </div>
                </div>

                <div className="print-settings__actions">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="action-button action-button--dark print-settings__btn text-theme-header"
                    >
                        <Printer size={18} /> Print Sheet
                    </button>
                </div>
            </div>
        </div>
    );
}
