import { useState } from 'react';
import { FlameKindling, Plus } from 'lucide-react';

interface HomebrewFieldEffectArchetypesProps {
    allTypes: string[];
    onAddTag: (tag: string) => void;
}

export function HomebrewFieldEffectArchetypes({ allTypes, onAddTag }: HomebrewFieldEffectArchetypesProps) {
    const [selectedTypeForBoost, setSelectedTypeForBoost] = useState<string>('Fire');
    const [selectedStatForBuff, setSelectedStatForBuff] = useState<string>('Spe');
    const [selectedStatusForImmunity, setSelectedStatusForImmunity] = useState<string>('Burn');

    return (
        <div className="hb-fe-modal__section">
            <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FlameKindling size={14} /> Quick Archetype Templates
            </label>
            <div className="hb-fe-preset-chips">
                {/* Type Damage Boost */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        className="hb-fe-preset-chip"
                        onClick={() => onAddTag(`[Dmg +1: ${selectedTypeForBoost}]`)}
                        title="Add Type Damage Boost Tag"
                    >
                        <Plus size={12} /> Dmg +1:
                    </button>
                    <select
                        className="bo-input text-subtext"
                        value={selectedTypeForBoost}
                        onChange={(e) => setSelectedTypeForBoost(e.target.value)}
                        style={{ padding: '2px 4px', fontSize: '0.75rem' }}
                    >
                        {allTypes.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                {/* End of Round Damage */}
                <button
                    type="button"
                    className="hb-fe-preset-chip"
                    onClick={() => onAddTag('[Deal 1 Damage at End of Round]')}
                    title="Add 1 Damage at End of Round"
                >
                    <Plus size={12} /> [Deal 1 Damage at End of Round]
                </button>

                {/* End of Round Healing */}
                <button
                    type="button"
                    className="hb-fe-preset-chip"
                    onClick={() => onAddTag('[Heal 1 Round End]')}
                    title="Add 1 HP Healing at End of Round"
                >
                    <Plus size={12} /> [Heal 1 Round End]
                </button>

                {/* Stat Stage Buff */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        className="hb-fe-preset-chip"
                        onClick={() => onAddTag(`[${selectedStatForBuff} +1]`)}
                        title="Add Stat Stage Buff"
                    >
                        <Plus size={12} /> Stat Buff:
                    </button>
                    <select
                        className="bo-input text-subtext"
                        value={selectedStatForBuff}
                        onChange={(e) => setSelectedStatForBuff(e.target.value)}
                        style={{ padding: '2px 4px', fontSize: '0.75rem' }}
                    >
                        <option value="Spe">Spe +1</option>
                        <option value="Def">Def +1</option>
                        <option value="Sp.Def">Sp.Def +1</option>
                        <option value="Atk">Atk +1</option>
                        <option value="Sp.Atk">Sp.Atk +1</option>
                        <option value="Acc">Acc +1</option>
                        <option value="Eva">Eva +1</option>
                    </select>
                </div>

                {/* Status Immunity */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        className="hb-fe-preset-chip"
                        onClick={() => onAddTag(`[Immune: ${selectedStatusForImmunity}]`)}
                        title="Add Status Immunity"
                    >
                        <Plus size={12} /> Status Immunity:
                    </button>
                    <select
                        className="bo-input text-subtext"
                        value={selectedStatusForImmunity}
                        onChange={(e) => setSelectedStatusForImmunity(e.target.value)}
                        style={{ padding: '2px 4px', fontSize: '0.75rem' }}
                    >
                        <option value="Burn">Burn</option>
                        <option value="Freeze">Freeze</option>
                        <option value="Paralysis">Paralysis</option>
                        <option value="Sleep">Sleep</option>
                        <option value="Poison">Poison</option>
                        <option value="Confusion">Confusion</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
