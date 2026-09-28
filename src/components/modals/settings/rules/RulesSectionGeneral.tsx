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

    return (
        <>
            {!isStandaloneMode && (
                <div>
                    <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                        Dice Engine{' '}
                        <TooltipIcon
                            onClick={() =>
                                onOpenInfo({
                                    title: 'Dice Engine Settings',
                                    content:
                                        'Select which Dice Extension to broadcast rolls to. Both engines support 3D dice and full sheet automation, but Custom Action Rolls may be better for performance and has more reliable accuracy with larger dice rolls.'
                                })
                            }
                        />
                    </label>
                    <select
                        className="identity-grid__select rules-modal__select text-subtext"
                        style={{ color: 'var(--text-main)' }}
                        value={diceEngine || 'car'}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) =>
                            handleRoomSelectChange(
                                'diceEngine',
                                e.target.value as 'dice-plus' | 'car',
                                e,
                                updateRoomSetting
                            )
                        }
                    >
                        <option value="car">Custom Action Rolls (3D Dice & Chat Log)</option>
                        <option value="dice-plus">Dice+ (3D Physics Dice)</option>
                    </select>
                    {diceEngine !== 'dice-plus' && (
                        <div
                            style={{
                                marginTop: '6px',
                                padding: '8px 10px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--panel-alt)',
                                border: '1px solid var(--primary)',
                                fontSize: '0.8rem',
                                lineHeight: '1.4'
                            }}
                        >
                            <span style={{ color: 'var(--text-main)' }}>
                                <strong>CAR Manifest URL:</strong>{' '}
                                <code style={{ wordBreak: 'break-all', color: 'var(--primary)' }}>
                                    https://custom-action-rolls.narcolepticdracu.com/manifest.json
                                </code>
                            </span>
                        </div>
                    )}
                </div>
            )}

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
                        GM Demo Mode (CAR Only){' '}
                        <TooltipIcon
                            onClick={() =>
                                onOpenInfo({
                                    title: 'GM Demonstration Mode',
                                    content:
                                        'When enabled, intercept ALL of your dice rolls and prompts you to specify the exact number of successes (or even the exact dice array!) you want the engine to fake. PERFECT for making tutorials/demo videos or for climactic GMing moments where you want a scenario to go a specific way. (GM ONLY FEATURE - does not affect player rolls). This feature ONLY works with the Custom Action Rolls dice engine option enabled, it is NOT compatible with Dice+.'
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
