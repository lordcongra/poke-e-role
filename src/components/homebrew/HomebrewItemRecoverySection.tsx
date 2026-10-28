import type { CustomItem } from '../../store/entityTypes';
import { NumberSpinner } from '../ui/NumberSpinner';
import { Heart, Zap, Shield, Sparkles } from 'lucide-react';

interface HomebrewItemRecoverySectionProps {
    item: CustomItem;
    canEdit: boolean;
    onChange: (field: 'healHp' | 'healWill' | 'gainTempHp' | 'gainTempWill', val: number | undefined) => void;
}

export function HomebrewItemRecoverySection({ item, canEdit, onChange }: HomebrewItemRecoverySectionProps) {
    return (
        <div className="homebrew-item-effects__recovery-card">
            {/* Restorative */}
            <div className="homebrew-item-effects__recovery-group">
                <span className="homebrew-item-effects__group-title text-subtext">Restorative</span>
                <div className="homebrew-item-effects__recovery-grid">
                    <div className="homebrew-item-effects__field homebrew-item-effects__field--inline">
                        <span className="homebrew-item-effects__field-label text-subtext">
                            <Heart size={12} style={{ color: 'var(--semantic-danger)' }} /> Heal/Reduce HP
                        </span>
                        <NumberSpinner
                            value={item.healHp ?? 0}
                            min={-99}
                            max={99}
                            compact
                            disabled={!canEdit}
                            onChange={(val) => onChange('healHp', val === 0 ? undefined : val)}
                        />
                    </div>

                    <div className="homebrew-item-effects__field homebrew-item-effects__field--inline">
                        <span className="homebrew-item-effects__field-label text-subtext">
                            <Zap size={12} style={{ color: 'var(--primary)' }} /> Restore/Reduce Will
                        </span>
                        <NumberSpinner
                            value={item.healWill ?? 0}
                            min={-99}
                            max={99}
                            compact
                            disabled={!canEdit}
                            onChange={(val) => onChange('healWill', val === 0 ? undefined : val)}
                        />
                    </div>
                </div>
            </div>

            {/* Temporary Shields */}
            <div className="homebrew-item-effects__recovery-group">
                <span className="homebrew-item-effects__group-title text-subtext">Temporary Shields</span>
                <div className="homebrew-item-effects__recovery-grid">
                    <div className="homebrew-item-effects__field homebrew-item-effects__field--inline">
                        <span className="homebrew-item-effects__field-label text-subtext">
                            <Shield size={12} style={{ color: 'var(--secondary)' }} /> Gain Temp HP
                        </span>
                        <NumberSpinner
                            value={item.gainTempHp ?? 0}
                            min={0}
                            max={99}
                            compact
                            disabled={!canEdit}
                            onChange={(val) => onChange('gainTempHp', val <= 0 ? undefined : val)}
                        />
                    </div>

                    <div className="homebrew-item-effects__field homebrew-item-effects__field--inline">
                        <span className="homebrew-item-effects__field-label text-subtext">
                            <Sparkles size={12} style={{ color: 'var(--primary)' }} /> Gain Temp Will
                        </span>
                        <NumberSpinner
                            value={item.gainTempWill ?? 0}
                            min={0}
                            max={99}
                            compact
                            disabled={!canEdit}
                            onChange={(val) => onChange('gainTempWill', val <= 0 ? undefined : val)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
