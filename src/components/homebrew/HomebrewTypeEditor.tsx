import { useState, useEffect } from 'react';
import type { CustomType } from '../../store/storeTypes';
import { HomebrewTypeMatchupPills } from './HomebrewTypeMatchupPills';
import './HomebrewTypes.css';

interface HomebrewTypeEditorProps {
    editingType: CustomType | null;
    allOptions: string[];
    canEdit: boolean;
    role: string;
    onSave: (oldName: string | null, newType: CustomType) => void;
    onCancel: () => void;
}

export function HomebrewTypeEditor({
    editingType,
    allOptions,
    canEdit,
    role,
    onSave,
    onCancel
}: HomebrewTypeEditorProps) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#9C27B0');
    const [gmOnly, setGmOnly] = useState(false);
    const [weaknesses, setWeaknesses] = useState<string[]>([]);
    const [resistances, setResistances] = useState<string[]>([]);
    const [immunities, setImmunities] = useState<string[]>([]);
    const [seAgainst, setSEAgainst] = useState<string[]>([]);
    const [nveAgainst, setNVEAgainst] = useState<string[]>([]);
    const [noEffectAgainst, setNoEffectAgainst] = useState<string[]>([]);

    const [selectedDropdown, setSelectedDropdown] = useState(allOptions[0] || 'Normal');

    useEffect(() => {
        if (editingType) {
            setName(editingType.name);
            setColor(editingType.color);
            setGmOnly(editingType.gmOnly || false);
            setWeaknesses(editingType.weaknesses || []);
            setResistances(editingType.resistances || []);
            setImmunities(editingType.immunities || []);
            setSEAgainst(editingType.seAgainst || []);
            setNVEAgainst(editingType.nveAgainst || []);
            setNoEffectAgainst(editingType.noEffectAgainst || []);
        } else {
            setName('');
            setColor('#9C27B0');
            setGmOnly(false);
            setWeaknesses([]);
            setResistances([]);
            setImmunities([]);
            setSEAgainst([]);
            setNVEAgainst([]);
            setNoEffectAgainst([]);
        }
    }, [editingType]);

    const handleSave = () => {
        if (!name.trim()) return;
        const newType: CustomType = {
            name: name.trim(),
            color,
            weaknesses,
            resistances,
            immunities,
            seAgainst,
            nveAgainst,
            noEffectAgainst,
            gmOnly
        };
        onSave(editingType ? editingType.name : null, newType);
    };

    const addToArray = (list: string[], setter: (value: string[]) => void) => {
        if (!list.includes(selectedDropdown)) setter([...list, selectedDropdown]);
    };

    const removeFromArray = (valueToRemove: string, list: string[], setter: (value: string[]) => void) => {
        setter(list.filter((item) => item !== valueToRemove));
    };

    if (!canEdit) return null;

    return (
        <>
            <div className="homebrew-types__editor-row">
                <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="homebrew-types__color-picker"
                />
                <input
                    type="text"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="homebrew-types__color-input"
                />
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Type Name"
                    className="homebrew-types__name-input"
                />
                {role === 'GM' && (
                    <label className="homebrew-types__gm-label">
                        <input type="checkbox" checked={gmOnly} onChange={(event) => setGmOnly(event.target.checked)} />
                        GM Only
                    </label>
                )}
            </div>

            <div className="homebrew-types__matchup-panel">
                <div className="homebrew-types__dropdown-row">
                    <select
                        className="identity-grid__select homebrew-types__select"
                        value={selectedDropdown}
                        onChange={(event) => setSelectedDropdown(event.target.value)}
                    >
                        {allOptions.map((typeOption) => (
                            <option key={typeOption} value={typeOption}>
                                {typeOption}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="homebrew-types__matchup-grid">
                    <div className="homebrew-types__matchup-col">
                        <h4 className="homebrew-types__matchup-title">Defensive</h4>
                        <button
                            type="button"
                            onClick={() => addToArray(weaknesses, setWeaknesses)}
                            className="action-button action-button--dark homebrew-types__matchup-btn homebrew-types__matchup-btn--first"
                        >
                            + Weak (2x)
                        </button>
                        <HomebrewTypeMatchupPills
                            items={weaknesses}
                            onRemove={(value) => removeFromArray(value, weaknesses, setWeaknesses)}
                            canEdit={canEdit}
                        />

                        <button
                            type="button"
                            onClick={() => addToArray(resistances, setResistances)}
                            className="action-button action-button--dark homebrew-types__matchup-btn"
                        >
                            + Resist (0.5x)
                        </button>
                        <HomebrewTypeMatchupPills
                            items={resistances}
                            onRemove={(value) => removeFromArray(value, resistances, setResistances)}
                            canEdit={canEdit}
                        />

                        <button
                            type="button"
                            onClick={() => addToArray(immunities, setImmunities)}
                            className="action-button action-button--dark homebrew-types__matchup-btn"
                        >
                            + Immune (0x)
                        </button>
                        <HomebrewTypeMatchupPills
                            items={immunities}
                            onRemove={(value) => removeFromArray(value, immunities, setImmunities)}
                            canEdit={canEdit}
                        />
                    </div>
                    <div className="homebrew-types__matchup-col">
                        <h4 className="homebrew-types__matchup-title homebrew-types__matchup-title--offensive">
                            Offensive
                        </h4>
                        <button
                            type="button"
                            onClick={() => addToArray(seAgainst, setSEAgainst)}
                            className="action-button action-button--dark homebrew-types__matchup-btn homebrew-types__matchup-btn--first"
                        >
                            + S.Effective (2x)
                        </button>
                        <HomebrewTypeMatchupPills
                            items={seAgainst}
                            onRemove={(value) => removeFromArray(value, seAgainst, setSEAgainst)}
                            canEdit={canEdit}
                        />

                        <button
                            type="button"
                            onClick={() => addToArray(nveAgainst, setNVEAgainst)}
                            className="action-button action-button--dark homebrew-types__matchup-btn"
                        >
                            + N.V.E (0.5x)
                        </button>
                        <HomebrewTypeMatchupPills
                            items={nveAgainst}
                            onRemove={(value) => removeFromArray(value, nveAgainst, setNVEAgainst)}
                            canEdit={canEdit}
                        />

                        <button
                            type="button"
                            onClick={() => addToArray(noEffectAgainst, setNoEffectAgainst)}
                            className="action-button action-button--dark homebrew-types__matchup-btn"
                        >
                            + No Effect (0x)
                        </button>
                        <HomebrewTypeMatchupPills
                            items={noEffectAgainst}
                            onRemove={(value) => removeFromArray(value, noEffectAgainst, setNoEffectAgainst)}
                            canEdit={canEdit}
                        />
                    </div>
                </div>
            </div>

            <div className="homebrew-types__actions-row">
                {editingType && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="action-button action-button--dark homebrew-types__btn-cancel"
                    >
                        Cancel Edit
                    </button>
                )}
                <button type="button" onClick={handleSave} className="action-button homebrew-types__btn-save">
                    {editingType ? '💾 Save Type' : '+ Add Type'}
                </button>
            </div>
        </>
    );
}
