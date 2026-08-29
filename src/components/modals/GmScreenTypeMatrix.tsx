import { useState, useMemo } from 'react';
import { Shield, Copy, Megaphone, Check } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { POKEMON_TYPES, TYPE_COLORS } from '../../data/constants';
import { getMatchupGroups } from '../../utils/typeMatchupLogic';
import { broadcastInfo } from '../../utils/diceRoller';
import './GmScreenTypeMatrix.css';

export function GmScreenTypeMatrix() {
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const role = useCharacterStore((state) => state.role);

    const [type1, setType1] = useState<string>('Normal');
    const [type2, setType2] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);

    const visibleTypes = useMemo(() => {
        return roomCustomTypes.filter((type) => role === 'GM' || !type.gmOnly);
    }, [roomCustomTypes, role]);

    const allTypeOptions = useMemo(() => {
        const standard = POKEMON_TYPES.filter((t) => t !== '');
        const custom = visibleTypes.map((t) => t.name);
        return [...standard, ...custom];
    }, [visibleTypes]);

    const allTypeColors = useMemo(() => {
        const customColorMap = Object.fromEntries(visibleTypes.map((t) => [t.name, t.color]));
        return {
            ...TYPE_COLORS,
            ...customColorMap
        };
    }, [visibleTypes]);

    const matchupGroups = useMemo(() => {
        return getMatchupGroups(type1, type2, visibleTypes, []);
    }, [type1, type2, visibleTypes]);

    const combinedTypeName = type2 ? `${type1} / ${type2}` : type1;

    const copyDiscordSummary = async () => {
        const weak4 = matchupGroups[4]?.length ? `\n• **4x Weak:** ${matchupGroups[4].join(', ')}` : '';
        const weak2 = matchupGroups[2]?.length ? `\n• **2x Weak:** ${matchupGroups[2].join(', ')}` : '';
        const resistHalf = matchupGroups[0.5]?.length ? `\n• **0.5x Resist:** ${matchupGroups[0.5].join(', ')}` : '';
        const resistQuarter = matchupGroups[0.25]?.length
            ? `\n• **0.25x Resist:** ${matchupGroups[0.25].join(', ')}`
            : '';
        const immune = matchupGroups[0]?.length ? `\n• **Immune (0x):** ${matchupGroups[0].join(', ')}` : '';

        const text = `## 🛡️ **Type Matchup Profile: ${combinedTypeName}**${weak4}${weak2}${resistHalf}${resistQuarter}${immune}`;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('[GmScreenTypeMatrix] Failed to copy text to clipboard:', error);
        }
    };

    const handleBroadcast = () => {
        const weaknesses = [...(matchupGroups[4] || []), ...(matchupGroups[2] || [])].join(', ') || 'None';
        const resistances = [...(matchupGroups[0.5] || []), ...(matchupGroups[0.25] || [])].join(', ') || 'None';
        const immunities = (matchupGroups[0] || []).join(', ') || 'None';

        const broadcastText = `Type Matchup for ${combinedTypeName}:\n• Weak: ${weaknesses}\n• Resist: ${resistances}\n• Immune: ${immunities}`;
        broadcastInfo(`Type Matchup: ${combinedTypeName}`, broadcastText);
    };

    return (
        <div className="type-matrix">
            <div className="type-matrix__header">
                <div className="type-matrix__title text-title-primary">
                    <Shield size={18} /> Interactive Type Matchup Calculator
                </div>
            </div>

            <div className="type-matrix__selectors">
                <div className="type-matrix__field">
                    <label className="text-label" htmlFor="type-matrix-primary">
                        Primary Type
                    </label>
                    <select
                        id="type-matrix-primary"
                        className="type-matrix__select text-subtext"
                        value={type1}
                        onChange={(e) => setType1(e.target.value)}
                    >
                        {allTypeOptions.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="type-matrix__field">
                    <label className="text-label" htmlFor="type-matrix-secondary">
                        Secondary Type (Optional)
                    </label>
                    <select
                        id="type-matrix-secondary"
                        className="type-matrix__select text-subtext"
                        value={type2}
                        onChange={(e) => setType2(e.target.value)}
                    >
                        <option value="">(None - Single Type)</option>
                        {allTypeOptions
                            .filter((t) => t !== type1)
                            .map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                    </select>
                </div>
            </div>

            <div className="type-matrix__results">
                {matchupGroups[4]?.length > 0 && (
                    <div className="type-matrix__group">
                        <span className="type-matrix__group-label" style={{ color: 'var(--semantic-danger)' }}>
                            4x Weakness (+2 Damage Dice/Successes)
                        </span>
                        <div className="type-matrix__pill-row">
                            {matchupGroups[4].map((t) => (
                                <span
                                    key={t}
                                    className="type-matrix__pill"
                                    style={{ backgroundColor: allTypeColors[t] || '#666' }}
                                >
                                    {t} (4x)
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {matchupGroups[2]?.length > 0 && (
                    <div className="type-matrix__group">
                        <span className="type-matrix__group-label" style={{ color: 'var(--semantic-danger)' }}>
                            2x Weakness (+1 Extra Damage)
                        </span>
                        <div className="type-matrix__pill-row">
                            {matchupGroups[2].map((t) => (
                                <span
                                    key={t}
                                    className="type-matrix__pill"
                                    style={{ backgroundColor: allTypeColors[t] || '#666' }}
                                >
                                    {t} (2x)
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {matchupGroups[0.5]?.length > 0 && (
                    <div className="type-matrix__group">
                        <span className="type-matrix__group-label" style={{ color: 'var(--primary)' }}>
                            0.5x Resistance (-1 Damage Reduced)
                        </span>
                        <div className="type-matrix__pill-row">
                            {matchupGroups[0.5].map((t) => (
                                <span
                                    key={t}
                                    className="type-matrix__pill"
                                    style={{ backgroundColor: allTypeColors[t] || '#666' }}
                                >
                                    {t} (0.5x)
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {matchupGroups[0.25]?.length > 0 && (
                    <div className="type-matrix__group">
                        <span className="type-matrix__group-label" style={{ color: 'var(--primary)' }}>
                            0.25x Resistance (-2 Damage Reduced)
                        </span>
                        <div className="type-matrix__pill-row">
                            {matchupGroups[0.25].map((t) => (
                                <span
                                    key={t}
                                    className="type-matrix__pill"
                                    style={{ backgroundColor: allTypeColors[t] || '#666' }}
                                >
                                    {t} (0.25x)
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {matchupGroups[0]?.length > 0 && (
                    <div className="type-matrix__group">
                        <span className="type-matrix__group-label" style={{ color: 'var(--text-muted)' }}>
                            0x Immunity (No Damage Taken)
                        </span>
                        <div className="type-matrix__pill-row">
                            {matchupGroups[0].map((t) => (
                                <span
                                    key={t}
                                    className="type-matrix__pill"
                                    style={{ backgroundColor: allTypeColors[t] || '#666' }}
                                >
                                    {t} (Immune)
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="type-matrix__actions">
                <button
                    type="button"
                    className="action-button action-button--dark type-matrix__btn"
                    onClick={copyDiscordSummary}
                    title="Copy formatted matchup for Discord"
                >
                    {copied ? (
                        <>
                            <Check size={14} color="var(--primary)" /> Copied!
                        </>
                    ) : (
                        <>
                            <Copy size={14} /> Copy for Discord
                        </>
                    )}
                </button>
                <button
                    type="button"
                    className="action-button action-button--theme type-matrix__btn"
                    onClick={handleBroadcast}
                    title="Broadcast matchup profile to Owlbear table / chat"
                >
                    <Megaphone size={14} /> Broadcast
                </button>
            </div>
        </div>
    );
}
