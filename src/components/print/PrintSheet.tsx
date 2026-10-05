import { useState, useEffect, useMemo } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getAbilityText, parseCombatTags } from '../../utils/combat/combatUtils';
import { fetchAbilityData } from '../../utils/api/api';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';
import { imageManager } from '../../utils/graphics/imageManager';
import { PrintHeader } from './PrintHeader';
import { PrintStatsGrid } from './PrintStatsGrid';
import { PrintSkillsGrid } from './PrintSkillsGrid';
import { PrintAbilitiesTable } from './PrintAbilitiesTable';
import { PrintMovesTable } from './PrintMovesTable';
import { PrintItemsNotes } from './PrintItemsNotes';
import './PrintSheet.css';

export function PrintSheet() {
    const identity = useCharacterStore((state) => state.identity);
    const moves = useCharacterStore((state) => state.moves);
    const inventory = useCharacterStore((state) => state.inventory);
    const notes = useCharacterStore((state) => state.notes);
    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const passives = useCharacterStore((state) => state.passives);
    const config = identity.printConfig;

    const [fetchedAbilities, setFetchedAbilities] = useState<Record<string, string>>({});
    const [resolvedTokenUrl, setResolvedTokenUrl] = useState<string>('');
    const [isReadyToPrint, setIsReadyToPrint] = useState(false);

    // 1. Calculate Combat Modifiers for accurate totals across stats and skills
    const abilityText = getAbilityText(identity.ability, roomCustomAbilities);
    const inventoryModifiers = useMemo(
        () => parseCombatTags(inventory, extraCategories, undefined, abilityText, passives),
        [inventory, extraCategories, abilityText, passives]
    );

    const fullState = useCharacterStore.getState();

    // 2. Resolve Local Token Images & Ability Text
    useEffect(() => {
        let isMounted = true;
        const preparePrint = async () => {
            // Resolve Image
            if (identity.tokenImageUrl) {
                if (isStandaloneMode && identity.tokenImageUrl.startsWith('local-img:')) {
                    try {
                        const blobUrl = await imageManager.getImageUrl(identity.tokenImageUrl);
                        if (isMounted) setResolvedTokenUrl(blobUrl || '');
                    } catch (e) {
                        console.warn('[PrintSheet] Failed to resolve local image:', e);
                        if (isMounted) setResolvedTokenUrl('');
                    }
                } else if (isMounted) {
                    setResolvedTokenUrl(identity.tokenImageUrl);
                }
            }

            // Fetch missing ability descriptions
            const abilitiesToFetch =
                identity.availableAbilities && identity.availableAbilities.length > 0
                    ? identity.availableAbilities
                    : identity.ability
                      ? [identity.ability]
                      : [];

            const results: Record<string, string> = {};
            for (const abName of abilitiesToFetch) {
                if (!getAbilityText(abName, roomCustomAbilities)) {
                    const data = await fetchAbilityData(abName);
                    if (data && (data.Description || data.Effect)) {
                        results[abName] = [data.Description, data.Effect].filter(Boolean).join(' ');
                    }
                }
            }
            if (isMounted) {
                setFetchedAbilities(results);
                setIsReadyToPrint(true);
            }
        };

        preparePrint();
        return () => {
            isMounted = false;
        };
    }, [identity.availableAbilities, identity.ability, identity.tokenImageUrl, roomCustomAbilities]);

    // 3. Trigger Print Dialog once everything is resolved
    useEffect(() => {
        if (isReadyToPrint) {
            const handleAfterPrint = () => {
                useCharacterStore.getState().setIdentity('isPrinting', false);
            };

            window.addEventListener('afterprint', handleAfterPrint);

            const timer = setTimeout(() => {
                window.print();
            }, 250);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('afterprint', handleAfterPrint);
            };
        }
    }, [isReadyToPrint]);

    return (
        <div className={`print-sheet-wrapper ${config.compactMode ? 'print-sheet-wrapper--compact' : ''}`}>
            <div className="print-sheet">
                <PrintHeader identity={identity} config={config} />
                <PrintStatsGrid
                    resolvedTokenUrl={resolvedTokenUrl}
                    fullState={fullState}
                    inventoryModifiers={inventoryModifiers}
                    config={config}
                />
                <PrintSkillsGrid fullState={fullState} inventoryModifiers={inventoryModifiers} config={config} />
                <PrintAbilitiesTable
                    identity={identity}
                    roomCustomAbilities={roomCustomAbilities}
                    fetchedAbilities={fetchedAbilities}
                    config={config}
                />
                <PrintMovesTable moves={moves} config={config} />
                <PrintItemsNotes inventory={inventory} passives={passives} notes={notes} config={config} />
            </div>
        </div>
    );
}
