import React, { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { RotateCcw } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { fetchBaseSpeciesTyping, type BaseSpeciesTyping } from '@/utils/combat/proteanLiberoUtils';
import { TYPE_COLORS } from '@/data/constants';

function TypePill({ typeName }: { typeName?: string }) {
    if (!typeName || typeName.toLowerCase() === 'none') return null;
    const bg = TYPE_COLORS[typeName] || 'var(--primary)';
    return (
        <span style={{ backgroundColor: bg, color: '#fff', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
            {typeName}
        </span>
    );
}

export const AbilityTypeResetSection: React.FC = () => {
    const species = useCharacterStore((s) => s.identity.species);
    const type1 = useCharacterStore((s) => s.identity.type1);
    const type2 = useCharacterStore((s) => s.identity.type2);
    const currentAbility = useCharacterStore((s) => s.identity.ability);
    const setIdentity = useCharacterStore((s) => s.setIdentity);
    const [baseTypes, setBaseTypes] = useState<BaseSpeciesTyping | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!species) { setBaseTypes(null); return; }
        fetchBaseSpeciesTyping(species).then((res) => { if (isMounted) setBaseTypes(res); });
        return () => { isMounted = false; };
    }, [species]);

    if (!baseTypes) return null;

    const isTypingDifferent = (type1 || '').trim().toLowerCase() !== (baseTypes.type1 || '').trim().toLowerCase() ||
        (type2 || '').trim().toLowerCase() !== (baseTypes.type2 || '').trim().toLowerCase();
    const isProteanOrLibero = /protean|libero/i.test(currentAbility || '');

    if (!isTypingDifferent && !isProteanOrLibero) return null;

    const handleReset = () => {
        setIdentity('type1', baseTypes.type1);
        setIdentity('type2', baseTypes.type2);
        if (OBR.isAvailable) {
            const formatted = `${baseTypes.type1}${baseTypes.type2 ? ' / ' + baseTypes.type2 : ''}`;
            OBR.notification.show(`Reset typing to base (${formatted})`);
        }
    };

    return (
        <div className="ability-modal__override-drawer" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '6px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="text-subtext" style={{ fontSize: '0.72rem' }}>Current:</span>
                    <TypePill typeName={type1} />
                    <TypePill typeName={type2} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="text-subtext" style={{ fontSize: '0.72rem' }}>Base:</span>
                    <TypePill typeName={baseTypes.type1} />
                    <TypePill typeName={baseTypes.type2} />
                </div>
            </div>
            <button
                type="button"
                className="action-button action-button--dark"
                onClick={handleReset}
                disabled={!isTypingDifferent}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '3px 8px', opacity: isTypingDifferent ? 1 : 0.5, cursor: isTypingDifferent ? 'pointer' : 'default' }}
                title={isTypingDifferent ? 'Reset to base species typing' : 'Already at base species typing'}
            >
                <RotateCcw size={12} /> Reset to Base Type
            </button>
        </div>
    );
};
