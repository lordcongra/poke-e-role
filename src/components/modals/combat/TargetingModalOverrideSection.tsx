import { TooltipIcon } from '../../ui/TooltipIcon';

interface TargetingModalOverrideSectionProps {
    canOverride: boolean;
    overrideType: 'none' | 'dice' | 'flat' | 'dice-ignore';
    overrideValue: number;
    onOverrideTypeChange: (type: 'none' | 'dice' | 'flat' | 'dice-ignore') => void;
    onOverrideValueChange: (val: number) => void;
    onShowTooltip: (config: { title: string; content: string }) => void;
}

export function TargetingModalOverrideSection({
    canOverride,
    overrideType,
    overrideValue,
    onOverrideTypeChange,
    onOverrideValueChange,
    onShowTooltip
}: TargetingModalOverrideSectionProps) {
    if (!canOverride) return null;

    return (
        <div className="targeting-modal__override-box">
            <label
                className="targeting-modal__label text-label"
                style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
            >
                Damage Override{' '}
                <TooltipIcon
                    onClick={() =>
                        onShowTooltip({
                            title: 'Damage Override Modes',
                            content:
                                "Dice Pool (Vs Def): Sets the base dice rolled against the target's Defense.\n\nDice Pool (Ignore Def): Sets the base dice rolled but completely ignores the target's Defense reduction.\n\nTrue Damage (Flat): Bypasses rolling entirely and inflicts exact, flat damage directly onto the target."
                        })
                    }
                />
            </label>
            <div className="targeting-modal__override-row">
                <select
                    className="targeting-modal__select text-label"
                    style={{ color: 'var(--text-main)', flex: 2 }}
                    value={overrideType}
                    onChange={(e) => onOverrideTypeChange(e.target.value as 'none' | 'dice' | 'flat' | 'dice-ignore')}
                >
                    <option value="none">Disabled</option>
                    <option value="dice">Dice Pool (Vs Def)</option>
                    <option value="dice-ignore">Dice Pool (Ignore Def)</option>
                    <option value="flat">True Damage (Flat)</option>
                </select>
                {overrideType !== 'none' && (
                    <input
                        type="number"
                        value={overrideValue}
                        onChange={(e) => onOverrideValueChange(Number(e.target.value) || 0)}
                        className="targeting-modal__input text-value-highlight"
                        style={{ flex: 1, marginTop: '2px' }}
                    />
                )}
            </div>
        </div>
    );
}
