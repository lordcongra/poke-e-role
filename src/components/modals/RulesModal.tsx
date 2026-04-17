import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { TooltipIcon } from '../ui/TooltipIcon';
import './RulesModal.css';

export function RulesModal({ onClose }: { onClose: () => void }) {
    const id = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
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
                                            'Select which Dice Extension to broadcast rolls to. Both engines support 3D physics dice and full sheet automation, but Custom Action Rolls also features a persistent chat log. (Global Room Setting)'
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
