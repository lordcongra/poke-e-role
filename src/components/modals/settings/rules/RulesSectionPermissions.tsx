import { useCharacterStore } from '../../../../store/useCharacterStore';
import { TooltipIcon } from '../../../ui/TooltipIcon';
import { isStandaloneMode } from '../../../../utils/sync/storageAdapter';
import { handleRoomSelectChange } from './rulesModalUtils';

interface RulesSectionPermissionsProps {
    onOpenInfo: (info: { title: string; content: string }) => void;
}

export function RulesSectionPermissions({ onOpenInfo }: RulesSectionPermissionsProps) {
    const homebrewAccess = useCharacterStore((state) => state.identity.homebrewAccess);
    const gmOnlyLootGen = useCharacterStore((state) => state.identity.gmOnlyLootGen);
    const gmOnlyGenerators = useCharacterStore((state) => state.identity.gmOnlyGenerators);
    const gmOnlyDamageOverride = useCharacterStore((state) => state.identity.gmOnlyDamageOverride);
    const gmOnlyMatchups = useCharacterStore((state) => state.identity.gmOnlyMatchups);
    const gmOnlyAttributeLock = useCharacterStore((state) => state.identity.gmOnlyAttributeLock);
    const updateRoomSetting = useCharacterStore((state) => state.updateRoomSetting);

    if (isStandaloneMode) {
        return null;
    }

    return (
        <>
            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Homebrew Access{' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
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
                    value={homebrewAccess || 'Full'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                        handleRoomSelectChange(
                            'homebrewAccess',
                            e.target.value as 'Full' | 'View Only' | 'None',
                            e,
                            updateRoomSetting
                        )
                    }
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
                            onOpenInfo({
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
                    value={gmOnlyLootGen === false ? 'Everyone' : 'GM Only'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                        handleRoomSelectChange('gmOnlyLootGen', e.target.value === 'GM Only', e, updateRoomSetting)
                    }
                >
                    <option value="GM Only">GM Only</option>
                    <option value="Everyone">Everyone</option>
                </select>
            </div>

            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Pokémon & Trainer Generators{' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
                                title: 'Character & Team Generators Access',
                                content:
                                    'Controls whether players can see and use the PKMN Gen and TRNR Gen tools on their toolbar. (Global Room Setting)'
                            })
                        }
                    />
                </label>
                <select
                    className="identity-grid__select rules-modal__select text-subtext"
                    style={{ color: 'var(--text-main)' }}
                    value={gmOnlyGenerators === false ? 'Everyone' : 'GM Only'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                        handleRoomSelectChange('gmOnlyGenerators', e.target.value === 'GM Only', e, updateRoomSetting)
                    }
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
                            onOpenInfo({
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
                    value={gmOnlyDamageOverride ? 'GM Only' : 'Everyone'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                        handleRoomSelectChange(
                            'gmOnlyDamageOverride',
                            e.target.value === 'GM Only',
                            e,
                            updateRoomSetting
                        )
                    }
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
                            onOpenInfo({
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
                    value={gmOnlyMatchups ? 'GM Only' : 'Everyone'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                        handleRoomSelectChange('gmOnlyMatchups', e.target.value === 'GM Only', e, updateRoomSetting)
                    }
                >
                    <option value="Everyone">Everyone</option>
                    <option value="GM Only">GM Only</option>
                </select>
            </div>

            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Unlock Sheet Attributes{' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
                                title: 'Unlock Sheet Attributes Permission',
                                content:
                                    'Controls whether players are allowed to unlock and edit the Base and Limit values in the Core and Social Attributes sections of their sheet. Defaults to "GM Only" to prevent players from accidentally editing Base/Limits instead of Rank. (Global Room Setting)'
                            })
                        }
                    />
                </label>
                <select
                    className="identity-grid__select rules-modal__select text-subtext"
                    style={{ color: 'var(--text-main)' }}
                    value={gmOnlyAttributeLock !== false ? 'GM Only' : 'Everyone'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                        handleRoomSelectChange(
                            'gmOnlyAttributeLock',
                            e.target.value === 'GM Only',
                            e,
                            updateRoomSetting
                        )
                    }
                >
                    <option value="GM Only">GM Only</option>
                    <option value="Everyone">Everyone</option>
                </select>
            </div>
        </>
    );
}
