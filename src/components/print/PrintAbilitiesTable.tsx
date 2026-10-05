import { Check } from 'lucide-react';
import { getAbilityText } from '../../utils/combat/combatUtils';
import type { IdentitySlice, PrintConfig, CustomAbility } from '../../store/storeTypes';

interface PrintAbilitiesTableProps {
    identity: IdentitySlice['identity'];
    roomCustomAbilities?: CustomAbility[];
    fetchedAbilities: Record<string, string>;
    config: PrintConfig;
}

export function PrintAbilitiesTable({
    identity,
    roomCustomAbilities,
    fetchedAbilities,
    config
}: PrintAbilitiesTableProps) {
    if (config.hideAbilities) return null;

    const rawList =
        identity.availableAbilities && identity.availableAbilities.length > 0
            ? identity.availableAbilities
            : identity.ability
              ? [identity.ability]
              : [];

    const filteredList = rawList.filter((abName) => !config.showOnlyActiveAbility || identity.ability === abName);

    if (config.autoHideEmptySections && filteredList.length === 0 && !config.blankAbilities) {
        return null;
    }

    return (
        <div className="print-sheet__section">
            <h4 className="print-sheet__section-title">Abilities</h4>
            <table className="print-sheet__ability-table">
                <thead>
                    <tr>
                        <th className="print-sheet__col-check">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={14} color="black" strokeWidth={3} />
                            </div>
                        </th>
                        <th className="print-sheet__col-ability">Ability</th>
                        {config.abilityDescStyle !== 'none' && <th>Description / Effects</th>}
                    </tr>
                </thead>
                <tbody>
                    {config.blankAbilities ? (
                        <>
                            <tr>
                                <td className="print-sheet__empty-cell"></td>
                                <td></td>
                                {config.abilityDescStyle !== 'none' && <td></td>}
                            </tr>
                            <tr>
                                <td className="print-sheet__empty-cell"></td>
                                <td></td>
                                {config.abilityDescStyle !== 'none' && <td></td>}
                            </tr>
                        </>
                    ) : (
                        filteredList.map((abName, i) => {
                            const isChecked = identity.ability === abName;
                            const customDesc = getAbilityText(abName, roomCustomAbilities || []);
                            const desc = customDesc || fetchedAbilities[abName] || '';

                            let showDesc = false;
                            if (config.abilityDescStyle === 'all') showDesc = true;
                            if (config.abilityDescStyle === 'selected' && isChecked) showDesc = true;

                            return (
                                <tr key={i}>
                                    <td className="print-sheet__checkbox-container">
                                        <div
                                            className="print-sheet__checkbox print-sheet__checkbox-box"
                                            style={{ backgroundColor: isChecked ? 'black' : 'white' }}
                                        />
                                    </td>
                                    <td>
                                        <strong>{abName}</strong>
                                    </td>
                                    {config.abilityDescStyle !== 'none' && <td>{showDesc ? desc : ''}</td>}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
