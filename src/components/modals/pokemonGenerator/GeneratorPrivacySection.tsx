import type { GeneratorConfig } from '../../../store/storeTypes';
import { TooltipIcon } from '../../ui/TooltipIcon';

export interface GeneratorPrivacySectionProps {
    config: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

const PRIVACY_ITEMS = [
    { key: 'privateNpcLock', label: 'NPC-locked' },
    { key: 'privateRolls', label: 'Private Rolls' },
    { key: 'privateGmTrackers', label: 'GM-Only UI Trackers' }
] as const;

export function GeneratorPrivacySection({ config, onUpdateConfig, onOpenTooltip }: GeneratorPrivacySectionProps) {
    const handleTogglePrivacyDefaults = (checked: boolean) => {
        onUpdateConfig({
            privacyDefaults: checked,
            privateNpcLock: checked ? (config.privateNpcLock ?? true) : false,
            privateRolls: checked ? (config.privateRolls ?? true) : false,
            privateGmTrackers: checked ? (config.privateGmTrackers ?? true) : false
        });
    };

    return (
        <div className="generator-modal__destination-box" style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }}
                >
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
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingLeft: '22px' }}>
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
        </div>
    );
}
