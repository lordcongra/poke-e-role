import { useState } from 'react';
import { ScrollText, X, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { TooltipIcon } from '../ui/TooltipIcon';
import { isStandaloneMode } from '../../utils/storageAdapter';
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
                    <h3 className="rules-modal__title modal-title-with-icon text-title-primary">
                        <ScrollText size={20} /> Room Rules & Permissions
                    </h3>
                    <button onClick={onClose} className="rules-modal__close-x" title="Close">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="rules-modal__form-group">
                    {!isStandaloneMode && (
                        <div>
                            <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                Dice Engine{' '}
                                <TooltipIcon
                                    onClick={() =>
                                        setModalConfig({
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
                                value={id.diceEngine || 'car'}
                                onChange={(e) => setIdentity('diceEngine', e.target.value as 'dice-plus' | 'car')}
                            >
                                <option value="dice-plus">Dice+ (3D Physics Dice)</option>
                                <option value="car">Custom Action Rolls (3D Dice & Chat Log)</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                            Ruleset{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Ruleset Settings',
                                        content: 'Determines how HP and Spec. Defense are calculated.'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select text-subtext"
                            style={{ color: 'var(--text-main)' }}
                            value={id.ruleset || 'vg-vit-hp'}
                            onChange={(e) => setIdentity('ruleset', e.target.value)}
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
                                    setModalConfig({
                                        title: 'Pain Penalties',
                                        content:
                                            'Automatically applies -1 or -2 success penalties to rolls when at low HP.'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select text-subtext"
                            style={{ color: 'var(--text-main)' }}
                            value={id.pain || 'Enabled'}
                            onChange={(e) => setIdentity('pain', e.target.value)}
                        >
                            <option>Enabled</option>
                            <option>Disabled</option>
                        </select>
                    </div>

                    {!isStandaloneMode && (
                        <>
                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
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
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.homebrewAccess || 'Full'}
                                    onChange={(e) => setIdentity('homebrewAccess', e.target.value)}
                                >
                                    <option value="Full">Full Access</option>
                                    <option value="View Only">View Only</option>
                                    <option value="None">None (Hidden)</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
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
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.gmOnlyLootGen === false ? 'Everyone' : 'GM Only'}
                                    onChange={(e) => setIdentity('gmOnlyLootGen', e.target.value === 'GM Only')}
                                >
                                    <option value="GM Only">GM Only</option>
                                    <option value="Everyone">Everyone</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                    Damage Override{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setModalConfig({
                                                title: 'Damage Override Permission',
                                                content:
                                                    'Controls if players can use the manual damage override tools in the Targeting Modal. (Global Room Setting)'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.gmOnlyDamageOverride ? 'GM Only' : 'Everyone'}
                                    onChange={(e) => setIdentity('gmOnlyDamageOverride', e.target.value === 'GM Only')}
                                >
                                    <option value="Everyone">Everyone</option>
                                    <option value="GM Only">GM Only</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
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
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.gmOnlyMatchups ? 'GM Only' : 'Everyone'}
                                    onChange={(e) => setIdentity('gmOnlyMatchups', e.target.value === 'GM Only')}
                                >
                                    <option value="Everyone">Everyone</option>
                                    <option value="GM Only">GM Only</option>
                                </select>
                            </div>

                            {role === 'GM' && (
                                <div>
                                    <label
                                        className="rules-modal__label text-label"
                                        style={{ color: 'var(--text-main)' }}
                                    >
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
                                        className="identity-grid__select rules-modal__select text-subtext"
                                        style={{ color: 'var(--text-main)' }}
                                        value={id.gmDemoMode ? 'Enabled' : 'Disabled'}
                                        onChange={(e) => setIdentity('gmDemoMode', e.target.value === 'Enabled')}
                                    >
                                        <option value="Disabled">Disabled</option>
                                        <option value="Enabled">Enabled</option>
                                    </select>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="action-button action-button--dark rules-modal__close-btn"
                    onClick={onClose}
                >
                    <XCircle size={18} /> Close
                </button>
            </div>

            {modalConfig && (
                <div className="rules-info__overlay">
                    <div className="rules-info__content">
                        <h3 className="rules-info__title text-title-primary">{modalConfig.title}</h3>
                        <hr className="rules-info__divider" />
                        <div
                            className="rules-info__text text-subtext"
                            style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}
                        >
                            {modalConfig.content}
                        </div>
                        <div className="rules-info__actions">
                            <button
                                type="button"
                                className="action-button action-button--dark rules-modal__close-btn"
                                onClick={() => setModalConfig(null)}
                            >
                                <XCircle size={18} /> Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
