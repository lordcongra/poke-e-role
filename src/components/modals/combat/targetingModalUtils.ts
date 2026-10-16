import OBR from '@owlbear-rodeo/sdk';
import { STATS_META_ID } from '../../../utils/graphics/graphicsManager';
import { calculateTargetDefensesFromMeta } from '../../../utils/combat/combatUtils';
import { isStandaloneMode, storageAdapter } from '../../../utils/sync/storageAdapter';
import { extractIsNpc } from '../../../utils/combat/initiativeHelpers';

export interface TargetOption {
    id: string;
    name: string;
    def: number;
    isTera: boolean;
    isPlayerSide: boolean;
    types: string[];
}

export function extractTargetTypesAndTera(
    meta: Record<string, unknown>,
    extraMeta?: Record<string, unknown>
): { isTera: boolean; types: string[] } {
    const stateObj = (meta.state || meta) as Record<string, unknown>;
    const identityObj = (stateObj?.identity || meta.identity || {}) as Record<string, unknown>;
    const isTera =
        meta['active-transformation'] === 'Terastallize' || identityObj.activeTransformation === 'Terastallize';
    const t1 = String(identityObj.type1 || meta.type1 || meta.Type1 || extraMeta?.type1 || extraMeta?.Type1 || '');
    const t2 = String(identityObj.type2 || meta.type2 || meta.Type2 || extraMeta?.type2 || extraMeta?.Type2 || '');
    const teraAffinity = isTera ? String(identityObj.terastallizeAffinity || meta['terastallize-affinity'] || '') : '';
    const rawTypes = isTera && teraAffinity ? [teraAffinity] : [t1, t2];
    return { isTera, types: rawTypes.filter(Boolean).map((t) => t.trim().toLowerCase()) };
}

export async function loadAvailableTargets(isPhysicalMove: boolean): Promise<TargetOption[]> {
    const availableTargets: TargetOption[] = [];

    // --- PATH 1: STANDALONE MODE ---
    if (isStandaloneMode) {
        try {
            const savedList = localStorage.getItem('pkr_standalone_init_list');
            if (savedList) {
                const initList = JSON.parse(savedList) as Record<string, unknown>[];
                if (Array.isArray(initList)) {
                    const localChars = await storageAdapter.getLocalCharacters();

                    initList.forEach((c) => {
                        const charId = String(c.id || '');
                        const matchingChar = localChars.find((lc) => lc.id === charId);

                        let name = String(c.name || 'Unknown');
                        let isTera = false;
                        let targetDef = 1;
                        let isPlayerSide = true;
                        let types: string[] = [];

                        if (typeof c.isPlayerSide === 'boolean') {
                            isPlayerSide = c.isPlayerSide;
                        } else if (matchingChar && matchingChar.metadata) {
                            const meta = matchingChar.metadata as Record<string, unknown>;
                            isPlayerSide = !extractIsNpc(meta);
                        }

                        if (matchingChar && matchingChar.metadata) {
                            const meta = matchingChar.metadata as Record<string, unknown>;
                            name = String(meta.nickname || meta.species || c.name || 'Unknown');
                            const extracted = extractTargetTypesAndTera(meta);
                            isTera = extracted.isTera;
                            types = extracted.types;

                            const { def, spd } = calculateTargetDefensesFromMeta(meta);
                            targetDef = isPhysicalMove ? def : spd;
                        }

                        availableTargets.push({
                            id: charId,
                            name,
                            def: targetDef,
                            isTera,
                            isPlayerSide,
                            types
                        });
                    });
                }
            }
        } catch (error) {
            console.error('[TargetingModal] Error loading standalone targets:', error);
        }
    }
    // --- PATH 2: OWLBEAR RODEO MODE ---
    else if (OBR.isAvailable) {
        try {
            const items = await OBR.scene.items.getItems();
            items.forEach((item) => {
                if (item.metadata['pokerole-pmd-extension/initiative'] !== undefined) {
                    const meta = (item.metadata[STATS_META_ID] || item.metadata) as Record<string, unknown>;
                    const name = String(meta.nickname || meta.species || item.name);
                    const { isTera, types } = extractTargetTypesAndTera(meta, item.metadata as Record<string, unknown>);

                    const { def, spd } = calculateTargetDefensesFromMeta(meta);
                    const targetDef = isPhysicalMove ? def : spd;
                    const isPlayerSide = !extractIsNpc(item.metadata);

                    availableTargets.push({ id: item.id, name, def: targetDef, isTera, isPlayerSide, types });
                }
            });
        } catch (error) {
            console.error('[TargetingModal] Error loading OBR targets:', error);
        }
    }

    const nameGroups: Record<string, string[]> = {};
    availableTargets.forEach((t) => {
        if (!nameGroups[t.name]) nameGroups[t.name] = [];
        nameGroups[t.name].push(t.id);
    });
    Object.values(nameGroups).forEach((ids) => ids.sort());

    return availableTargets.map((t) => {
        const ids = nameGroups[t.name];
        if (ids && ids.length > 1) {
            const num = ids.indexOf(t.id) + 1;
            return { ...t, name: `${t.name} #${num}` };
        }
        return t;
    });
}
