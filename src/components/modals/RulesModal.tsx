import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { TooltipIcon } from '../ui/TooltipIcon';
import './RulesModal.css';

export function RulesModal({ onClose }: { onClose: () => void }) {
    const id = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const role = useCharacterStore((state) => state.role);
    const [modalConfig, setModalConfig] = useState<{ title: string; content: string } | null>(null);

    return (
        <div className="rules-modal__overlay">
            <div className="rules-modal__content">
                <div className="rules-modal__header-row">
                    <h3 className="rules-modal__title">📜 Room Rules & Permissions</h3>
                    <button onClick={onClose} className="rules-modal__close-x" title="Close">
                        X
                    </button>
                </div>

                <div className="rules-modal__form-group">
                    <div>
                        <label className="rules-modal__label">
                            Dice Engine{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Dice Engine Settings',
                                        content:
                                            'Select which Dice Extension to broadcast rolls to. Both engines support 3D dice and full sheet automation, but Custom Action Rolls may be better for performance and has more realiable accuracy with larger dice rolls.'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select"
                            value={id.diceEngine || 'dice-plus'}
                            onChange={(e) => setIdentity('diceEngine', e.target.value as 'dice-plus' | 'car')}
                        >
                            <option value="dice-plus">Dice+ (3D Physics Dice)</option>
                            <option value="car">Custom Action Rolls (3D Dice & Chat Log)</option>
                        </select>
                    </div>

                    <div>
                        <label className="rules-modal__label">
                            Ruleset{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Ruleset Settings',
                                        content:
                                            'Determines how HP and Spec. Defense are calculated. (Global Room Setting)'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select"
                            value={id.ruleset || 'vg-vit-hp'}
                            onChange={(e) => setIdentity('ruleset', e.target.value)}
                        >
                            <option value="vg-vit-hp">VIT = DEF/HP, INS = SPD</option>
                            <option value="tabletop">VIT = DEF/SPD/HP</option>
                            <option value="vg-high-hp">VIT = DEF, INS = SPD; either VIT/INS used for HP</option>
                        </select>
                    </div>

                    <div>
                        <label className="rules-modal__label">
                            Pain Penalties{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Pain Penalties',
                                        content:
                                            'Automatically applies -1 or -2 success penalties to rolls when at low HP. (Global Room Setting)'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select"
                            value={id.pain || 'Enabled'}
                            onChange={(e) => setIdentity('pain', e.target.value)}
                        >
                            <option>Enabled</option>
                            <option>Disabled</option>
                        </select>
                    </div>

                    <div>
                        <label className="rules-modal__label">
                            Homebrew Access{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Homebrew Access',
                                        content:
                                            'Controls if players can view or edit the Homebrew Workshop. (Global Room Setting)'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select"
                            value={id.homebrewAccess || 'Full'}
                            onChange={(e) => setIdentity('homebrewAccess', e.target.value)}
                        >
                            <option value="Full">Full Access</option>
                            <option value="View Only">View Only</option>
                            <option value="None">None (Hidden)</option>
                        </select>
                    </div>

                    <div>
                        <label className="rules-modal__label">
                            Loot Generator{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Loot Generator',
                                        content:
                                            'Controls if players can see and use the Random Loot Generator button on their sheets. (Global Room Setting)'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select"
                            value={id.gmOnlyLootGen === false ? 'Everyone' : 'GM Only'}
                            onChange={(e) => setIdentity('gmOnlyLootGen', e.target.value === 'GM Only')}
                        >
                            <option value="GM Only">GM Only</option>
                            <option value="Everyone">Everyone</option>
                        </select>
                    </div>

                    <div>
                        <label className="rules-modal__label">
                            Type Matchups{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Type Matchups Visibility',
                                        content:
                                            'Controls if players can see the Type Matchups chart on locked NPC sheets. Useful for hiding custom typings or boss weaknesses from players. (Global Room Setting)'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select"
                            value={id.gmOnlyMatchups ? 'GM Only' : 'Everyone'}
                            onChange={(e) => setIdentity('gmOnlyMatchups', e.target.value === 'GM Only')}
                        >
                            <option value="Everyone">Everyone</option>
                            <option value="GM Only">GM Only</option>
                        </select>
                    </div>

                    {role === 'GM' && (
                        <div>
                            <label className="rules-modal__label">
                                GM Demo Mode (CAR Only){' '}
                                <TooltipIcon
                                    onClick={() =>
                                        setModalConfig({
                                            title: 'GM Demonstration Mode',
                                            content:
                                                'When enabled, intercept ALL of your dice rolls and prompts you to specify the exact number of successes (or even the exact dice array!) you want the engine to fake. PERFECT for making tutorials/demo videos or for climactic GMing moments where you want a scenario to go a specific way. (GM ONLY FEATURE - does not affect player rolls). This feature ONLY works with the Custom Action Rolls dice engine option enabled, it is NOT compatible with Dice+.'
                                        })
                                    }
                                />
                            </label>
                            <select
                                className="identity-grid__select rules-modal__select"
                                value={id.gmDemoMode ? 'Enabled' : 'Disabled'}
                                onChange={(e) => setIdentity('gmDemoMode', e.target.value === 'Enabled')}
                            >
                                <option value="Disabled">Disabled</option>
                                <option value="Enabled">Enabled</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {modalConfig && (
                <div className="rules-info__overlay">
                    <div className="rules-info__content">
                        <h3 className="rules-info__title">{modalConfig.title}</h3>
                        <hr className="rules-info__divider" />
                        <div className="rules-info__text">{modalConfig.content}</div>
                        <div style={{ textAlign: 'center' }}>
                            <button
                                className="action-button action-button--dark rules-modal__close-btn"
                                onClick={() => setModalConfig(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
