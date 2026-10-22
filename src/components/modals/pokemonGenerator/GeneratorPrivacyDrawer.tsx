import { Lock } from 'lucide-react';
import type { GeneratorConfig } from '../../../store/storeTypes';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { GeneratorDrawer } from './GeneratorDrawer';

export interface GeneratorPrivacyDrawerProps {
    isOpen: boolean;
    onToggle: () => void;
    config: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

const PRIVACY_ITEMS = [
    { key: 'privateNpcLock', label: 'NPC-locked' },
    { key: 'privateRolls', label: 'Private Rolls' },
    { key: 'privateGmTrackers', label: 'GM-Only UI Trackers' }
] as const;

export function getPrivacyDrawerSummary(config: GeneratorConfig): { text: string; isActive: boolean } {
    if (!config.privacyDefaults) {
        return { text: 'Standard Visibility', isActive: false };
    }
    const activeItems: string[] = [];
    if (config.privateNpcLock) activeItems.push('NPC Lock');
    if (config.privateRolls) activeItems.push('Private Rolls');
    if (config.privateGmTrackers) activeItems.push('GM Trackers');

    return {
        text: activeItems.length > 0 ? activeItems.join(' • ') : 'Private Active',
        isActive: true
    };
}

export function GeneratorPrivacyDrawer({
    isOpen,
    onToggle,
    config,
    onUpdateConfig,
    onOpenTooltip
}: GeneratorPrivacyDrawerProps) {
    const summary = getPrivacyDrawerSummary(config);

    const handleTogglePrivacyDefaults = (checked: boolean) => {
        onUpdateConfig({
            privacyDefaults: checked,
            privateNpcLock: checked ? (config.privateNpcLock ?? true) : false,
            privateRolls: checked ? (config.privateRolls ?? true) : false,
            privateGmTrackers: checked ? (config.privateGmTrackers ?? true) : false
        });
    };

    return (
        <GeneratorDrawer
            isOpen={isOpen}
            onToggle={onToggle}
            title="GM Privacy & Token Defaults"
            icon={<Lock size={16} />}
            summary={summary.text}
            summaryVariant={summary.isActive ? 'active' : 'default'}
        >
            <div className="generator-modal__privacy-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label
                        className="generator-modal__checkbox-label text-label"
                        style={{ margin: 0, fontWeight: 600 }}
                    >
                        <input
                            type="checkbox"
                            checked={Boolean(config.privacyDefaults)}
                            onChange={(e) => handleTogglePrivacyDefaults(e.target.checked)}
                            className="generator-modal__checkbox"
                        />
                        Private Token Defaults (GM Only)
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Private Token Defaults',
                                    desc: 'Automatically configures generated Pokémon with GM-exclusive privacy settings so players cannot view rolls, stat modifications, or map token HUD trackers.'
                                })
                            }
                        />
                    </label>
                </div>

                {config.privacyDefaults && (
                    <div
                        style={{
                            display: 'flex',
                            gap: '16px',
                            flexWrap: 'wrap',
                            paddingLeft: '22px',
                            marginTop: '8px'
                        }}
                    >
                        {PRIVACY_ITEMS.map(({ key, label }) => (
                            <label
                                key={key}
                                className="generator-modal__checkbox-label text-label"
                                style={{ margin: 0, fontSize: '0.82rem' }}
                            >
                                <input
                                    type="checkbox"
                                    checked={Boolean(config[key])}
                                    onChange={(e) => onUpdateConfig({ [key]: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </GeneratorDrawer>
    );
}
