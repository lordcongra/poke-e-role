import type React from 'react';
import { TooltipIcon } from '../../../ui/TooltipIcon';
import { useCharacterStore } from '../../../../store/useCharacterStore';
import { isStandaloneMode } from '../../../../utils/sync/storageAdapter';
import { flushRoomSettingsToOwlbear } from '../../../../utils/sync/obr';
import { renderAllSceneTokens } from '../../../../utils/graphics/graphicsRenderer';

interface RulesTokenHudVisibilityProps {
    onOpenInfo: (info: { title: string; content: string }) => void;
    gmOnlyTrackers?: boolean;
    onTrackersVisibilityChange: (gmOnly: boolean, e: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface HudElementToggle {
    key:
        | 'roomHideHpBar'
        | 'roomHideHpText'
        | 'roomHideWillBar'
        | 'roomHideWillText'
        | 'roomHideDef'
        | 'roomHideActions'
        | 'roomHideEvade'
        | 'roomHideClash';
    label: string;
}

const HUD_ELEMENTS: HudElementToggle[] = [
    { key: 'roomHideHpBar', label: 'HP Bar' },
    { key: 'roomHideHpText', label: 'HP Numbers' },
    { key: 'roomHideWillBar', label: 'Will Bar' },
    { key: 'roomHideWillText', label: 'Will Numbers' },
    { key: 'roomHideDef', label: 'Defenses Badge' },
    { key: 'roomHideActions', label: 'Action Counter' },
    { key: 'roomHideEvade', label: 'Evade Badge' },
    { key: 'roomHideClash', label: 'Clash Badge' }
];

export function RulesTokenHudVisibility({
    onOpenInfo,
    gmOnlyTrackers,
    onTrackersVisibilityChange
}: RulesTokenHudVisibilityProps) {
    const roomHideHpBar = useCharacterStore((state) => state.identity.roomHideHpBar ?? false);
    const roomHideHpText = useCharacterStore((state) => state.identity.roomHideHpText ?? false);
    const roomHideWillBar = useCharacterStore((state) => state.identity.roomHideWillBar ?? false);
    const roomHideWillText = useCharacterStore((state) => state.identity.roomHideWillText ?? false);
    const roomHideDef = useCharacterStore((state) => state.identity.roomHideDef ?? false);
    const roomHideActions = useCharacterStore((state) => state.identity.roomHideActions ?? false);
    const roomHideEvade = useCharacterStore((state) => state.identity.roomHideEvade ?? false);
    const roomHideClash = useCharacterStore((state) => state.identity.roomHideClash ?? false);
    const updateRoomSetting = useCharacterStore((state) => state.updateRoomSetting);

    const hideStates: Record<HudElementToggle['key'], boolean> = {
        roomHideHpBar,
        roomHideHpText,
        roomHideWillBar,
        roomHideWillText,
        roomHideDef,
        roomHideActions,
        roomHideEvade,
        roomHideClash
    };

    const handleToggle = (key: HudElementToggle['key'], nextVal: boolean) => {
        updateRoomSetting(key, nextVal);
        if (!isStandaloneMode) {
            flushRoomSettingsToOwlbear({ [key]: nextVal }).catch(() => {});
        }
        renderAllSceneTokens(true).catch(() => {});
    };

    return (
        <>
            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Token Trackers Visibility{' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
                                title: 'Token Trackers Visibility',
                                content:
                                    'Controls whether token HUD trackers (HP, Will, Defenses, Actions) are visible to players across the entire room. When set to "GM Only", all token HUDs are hidden from players and only visible to the GM. Default is "Everyone" (which respects each token\'s individual visibility settings).'
                            })
                        }
                    />
                </label>
                <select
                    className="identity-grid__select rules-modal__select text-subtext"
                    style={{ color: 'var(--text-main)' }}
                    value={gmOnlyTrackers ? 'GM Only' : 'Everyone'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => onTrackersVisibilityChange(e.target.value === 'GM Only', e)}
                >
                    <option value="Everyone">Everyone (Respect Token Settings)</option>
                    <option value="GM Only">GM Only (Hide All From Players)</option>
                </select>
            </div>

            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Hide HUD Elements (Room-Wide){' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
                                title: 'Hide HUD Elements (Room-Wide)',
                                content:
                                    'Allows the GM to globally suppress specific token HUD elements across all tokens in the room regardless of individual token settings. Checking an element hides it from all tokens.'
                            })
                        }
                    />
                </label>
                <div className="rules-modal__hud-visibility-card">
                    <div className="rules-modal__hud-visibility-grid">
                        {HUD_ELEMENTS.map((item) => (
                            <label
                                key={item.key}
                                className="rules-modal__checkbox-label text-subtext"
                                title={`Hide ${item.label} room-wide`}
                            >
                                <input
                                    type="checkbox"
                                    checked={Boolean(hideStates[item.key])}
                                    onChange={(e) => handleToggle(item.key, e.target.checked)}
                                    style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                                />
                                <span>{item.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
