import { useState } from 'react';
import { Check, Copy, AlertTriangle } from 'lucide-react';
import { useCharacterStore } from '../../../../store/useCharacterStore';
import { TooltipIcon } from '../../../ui/TooltipIcon';
import { isStandaloneMode } from '../../../../utils/sync/storageAdapter';
import { handleRoomSelectChange } from './rulesModalUtils';

interface RulesSectionGeneralProps {
    onOpenInfo: (info: { title: string; content: string }) => void;
}

export function RulesSectionGeneral({ onOpenInfo }: RulesSectionGeneralProps) {
    const diceEngine = useCharacterStore((state) => state.identity.diceEngine);
    const ruleset = useCharacterStore((state) => state.identity.ruleset);
    const pain = useCharacterStore((state) => state.identity.pain);
    const pmdSkills = useCharacterStore((state) => state.identity.pmdSkills);
    const gmDemoMode = useCharacterStore((state) => state.identity.gmDemoMode);
    const role = useCharacterStore((state) => state.role);
    const updateRoomSetting = useCharacterStore((state) => state.updateRoomSetting);

    const [copiedManifest, setCopiedManifest] = useState(false);
    const carManifestUrl = 'https://custom-action-rolls.narcolepticdracu.com/manifest.json';

    const handleCopyManifest = () => {
        try {
            navigator.clipboard.writeText(carManifestUrl);
            setCopiedManifest(true);
            setTimeout(() => setCopiedManifest(false), 2000);
        } catch (e) {
            console.warn('[RulesSectionGeneral] Clipboard write failed:', e);
        }
    };

    return (
        <>
            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Dice Engine / Roll Mode{' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
                                title: 'Dice Engine & Roll Mode Settings',
                                content:
                                    'Choose between Custom Action Rolls (3D dice that roll onto the table and post to the roll log) or Pure Roll Log (instant math results sent directly to the roll log without spawning 3D dice, ideal for low-spec devices or tables without 3D dice plugins).'
                            })
                        }
                    />
                </label>

                <select
                    className="identity-grid__select rules-modal__select text-subtext"
                    style={{ color: 'var(--text-main)', marginBottom: '8px' }}
                    value={diceEngine || 'car'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                        handleRoomSelectChange('diceEngine', e.target.value as 'car' | 'log-only', e, updateRoomSetting)
                    }
                >
                    <option value="car">Custom Action Rolls (3D Dice & Roll Log)</option>
                    <option value="log-only">Pure Roll Log (Performance Mode / No 3D Dice)</option>
                </select>

                {diceEngine === 'log-only' ? (
                    <div
                        style={{
                            padding: '8px 10px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--panel-alt)',
                            border: '1px solid var(--primary)',
                            fontSize: '0.8rem',
                            lineHeight: '1.4',
                            color: 'var(--text-main)'
                        }}
                    >
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>⚡ Performance Mode Active:</span>{' '}
                        All calculations, combat tags, crits, and health/tracker intercepts resolve instantly and log
                        directly to the in-app roll log without rendering 3D dice. No external plugins required!
                    </div>
                ) : (
                    <div
                        style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--panel-alt)',
                            border: '1px solid var(--primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                flexWrap: 'wrap'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                    Custom Action Rolls (CAR)
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.72rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'rgba(74, 222, 128, 0.15)',
                                        color: '#4ade80',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Check size={12} /> Active 3D Engine
                                </span>
                            </div>

                            <button
                                type="button"
                                className="action-button action-button--theme"
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '0.75rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    cursor: 'pointer'
                                }}
                                onClick={handleCopyManifest}
                                title="Copy CAR Manifest URL to clipboard"
                            >
                                {copiedManifest ? <Check size={13} /> : <Copy size={13} />}
                                {copiedManifest ? 'Copied URL!' : 'Copy Manifest URL'}
                            </button>
                        </div>

                        <div
                            style={{
                                padding: '6px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--panel-bg)',
                                border: '1px solid var(--semantic-danger, #e53e3e)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '6px',
                                fontSize: '0.78rem',
                                lineHeight: '1.35',
                                color: 'var(--text-main)'
                            }}
                        >
                            <AlertTriangle
                                size={15}
                                style={{
                                    color: 'var(--semantic-danger, #e53e3e)',
                                    flexShrink: 0,
                                    marginTop: '2px'
                                }}
                            />
                            <div>
                                <strong>Dice+ Retired:</strong> The legacy Dice+ engine has been removed. All rolls now
                                route through <strong>Custom Action Rolls</strong>. If your Owlbear room does not have
                                CAR installed yet, use the button above to copy the manifest link to install it.
                            </div>
                        </div>

                        <div
                            style={{
                                fontSize: '0.78rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                flexWrap: 'wrap'
                            }}
                        >
                            <span>CAR Manifest:</span>
                            <code style={{ wordBreak: 'break-all', color: 'var(--primary)', userSelect: 'all' }}>
                                {carManifestUrl}
                            </code>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Ruleset{' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
                                title: 'Ruleset Settings',
                                content: 'Determines how HP and Spec. Defense are calculated.'
                            })
                        }
                    />
                </label>
                <select
                    className="identity-grid__select rules-modal__select text-subtext"
                    style={{ color: 'var(--text-main)' }}
                    value={ruleset || 'vg-vit-hp'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => handleRoomSelectChange('ruleset', e.target.value, e, updateRoomSetting)}
                >
                    <option value="vg-vit-hp">VIT = DEF/HP, INS = SPD</option>
                    <option value="tabletop">VIT = DEF/SPD/HP</option>
                    <option value="vg-high-hp">VIT = DEF, INS = SPD; either VIT/INS used for HP</option>
                </select>
            </div>

            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Pain Penalties{' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
                                title: 'Pain Penalties',
                                content: 'Automatically applies -1 or -2 success penalties to rolls when at low HP.'
                            })
                        }
                    />
                </label>
                <select
                    className="identity-grid__select rules-modal__select text-subtext"
                    style={{ color: 'var(--text-main)' }}
                    value={pain || 'Enabled'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => handleRoomSelectChange('pain', e.target.value, e, updateRoomSetting)}
                >
                    <option>Enabled</option>
                    <option>Disabled</option>
                </select>
            </div>

            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Pokémon PMD Skills{' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
                                title: 'Pokémon PMD Skills (Knowledge Category)',
                                content:
                                    'Controls whether Pokémon sheets display the Mystery Dungeon Knowledge skills (Crafts, Lore, Medicine, Magic). If disabled, the Knowledge category is hidden on Pokémon sheets. Standard Trainer sheets always retain Knowledge skills. Enabled by default for backwards compatibility.'
                            })
                        }
                    />
                </label>
                <select
                    className="identity-grid__select rules-modal__select text-subtext"
                    style={{ color: 'var(--text-main)' }}
                    value={pmdSkills !== false ? 'Enabled' : 'Disabled'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                        handleRoomSelectChange('pmdSkills', e.target.value === 'Enabled', e, updateRoomSetting)
                    }
                >
                    <option value="Enabled">Enabled (Default - Mystery Dungeon)</option>
                    <option value="Disabled">Disabled (Base Pokémon)</option>
                </select>
            </div>

            {(isStandaloneMode || role === 'GM') && (
                <div>
                    <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                        GM Demo Mode{' '}
                        <TooltipIcon
                            onClick={() =>
                                onOpenInfo({
                                    title: 'GM Demonstration Mode',
                                    content:
                                        'When enabled, intercept ALL of your dice rolls and prompts you to specify the exact number of successes (or even the exact dice array!) you want the engine to fake. PERFECT for making tutorials/demo videos or for climactic GMing moments where you want a scenario to go a specific way. (GM ONLY FEATURE - does not affect player rolls).'
                                })
                            }
                        />
                    </label>
                    <select
                        className="identity-grid__select rules-modal__select text-subtext"
                        style={{ color: 'var(--text-main)' }}
                        value={gmDemoMode ? 'Enabled' : 'Disabled'}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) =>
                            handleRoomSelectChange('gmDemoMode', e.target.value === 'Enabled', e, updateRoomSetting)
                        }
                    >
                        <option value="Disabled">Disabled</option>
                        <option value="Enabled">Enabled</option>
                    </select>
                </div>
            )}
        </>
    );
}
