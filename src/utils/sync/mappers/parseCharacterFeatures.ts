import type {
    MoveData,
    ExtraCategory,
    InventoryItem,
    PassiveItem,
    StatusItem,
    EffectItem,
    CustomInfo,
    Badge,
    TrainerPokedexData,
    ItemAttackAction
} from '@/store/storeTypes';
import { getItemArt } from '@/utils/graphics/itemArtCatalog';
import { KNOWN_ITEMS } from '@/data/constants';
import { mapAttr, mapSkill } from './mapperHelpers';

export function parseMoves(meta: Record<string, unknown>, parsedExtraCats: ExtraCategory[]): MoveData[] {
    try {
        const rawMoves = meta['moves-data'] ? JSON.parse(String(meta['moves-data'])) : [];
        if (!Array.isArray(rawMoves)) return [];

        return rawMoves.map((m: Record<string, unknown>) => {
            const rawCat = String(m.category || m.Category || 'Physical');
            const cat = rawCat.startsWith('Phys') ? 'Physical' : rawCat.startsWith('Spec') ? 'Special' : 'Status';

            const rawDmgCandidate = [m.dmg1, m.Damage1, m.Damage2]
                .filter((d) => d && d !== 'None' && String(d).trim() !== '')
                .join('/');

            return {
                id: (m.id as string) || crypto.randomUUID(),
                active: m.active === true || m.active === 'true',
                name: String(m.name || m.Name || ''),
                type: String(m.type || m.Type || 'Normal'),
                category: cat as 'Physical' | 'Special' | 'Status',
                acc1: mapAttr(String(m.acc1 !== undefined ? m.acc1 : m.Accuracy1 || 'none')) || 'none',
                acc2: mapSkill(String(m.acc2 || m.Accuracy2 || 'none'), parsedExtraCats),
                dmg1: mapAttr(rawDmgCandidate),
                power: Number(m.power !== undefined ? m.power : m.Power || 0),
                desc: String(m.desc || m.Description || m.Effect || ''),
                marker: String(m.marker || m.Marker || ''),
                ...(m.mimicBackup ? { mimicBackup: m.mimicBackup as MoveData } : {}),
                ...(m.dualScaleSelected !== undefined
                    ? { dualScaleSelected: m.dualScaleSelected === true || m.dualScaleSelected === 'true' }
                    : {})
            };
        });
    } catch (e) {
        console.warn('[StateMapper] Failed to parse moves from metadata:', e);
        return [];
    }
}

export function parseInventory(meta: Record<string, unknown>): InventoryItem[] {
    try {
        const rawInv = meta['inv-data'] ? JSON.parse(String(meta['inv-data'])) : [];
        if (!Array.isArray(rawInv)) return [];

        return rawInv.map((i: Record<string, unknown>) => {
            const rawName = String(i.name || i.Name || '');
            let imageUrl = typeof i.imageUrl === 'string' ? i.imageUrl : undefined;
            if ((!imageUrl || imageUrl === 'none') && rawName) {
                const known = getItemArt(rawName);
                if (known) imageUrl = known;
            }
            const rawDesc = String(i.desc || i.Description || i.Effect || '');
            let tags = typeof i.tags === 'string' ? i.tags : '';
            let cleanDesc = rawDesc;

            // Legacy compatibility: If desc contains bracket tags [ ... ],
            // extract them into tags and clean up desc!
            const legacyMatches = Array.from(rawDesc.matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`);
            if (legacyMatches.length > 0) {
                const currentTagList = tags
                    ? Array.from(tags.matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`)
                    : [];
                tags = Array.from(new Set([...currentTagList, ...legacyMatches])).join(' ');
                cleanDesc = rawDesc
                    .replace(/\[.*?\]/g, '')
                    .replace(/\n\s*\n+/g, '\n')
                    .trim();
            }

            // Auto-tag known items if tags are empty!
            if (!tags && rawName) {
                const knownItemMatch = KNOWN_ITEMS.find((k) => k.name.toLowerCase() === rawName.toLowerCase());
                if (knownItemMatch?.tags) {
                    tags = knownItemMatch.tags;
                }
            }

            return {
                id: (i.id as string) || crypto.randomUUID(),
                qty: Number(i.qty !== undefined ? i.qty : 1),
                name: rawName,
                desc: cleanDesc,
                tags: tags || undefined,
                active: i.active === true || i.active === 'true',
                imageUrl,
                showInRollLog: i.showInRollLog !== false && i.showInRollLog !== 'false',
                boostLevel: typeof i.boostLevel === 'number' && !isNaN(i.boostLevel) ? i.boostLevel : undefined,
                charges: typeof i.charges === 'number' && !isNaN(i.charges) ? i.charges : undefined,
                maxCharges: typeof i.maxCharges === 'number' && !isNaN(i.maxCharges) ? i.maxCharges : undefined,
                destroyOnDepletion: typeof i.destroyOnDepletion === 'boolean' ? i.destroyOnDepletion : undefined,
                healHp: typeof i.healHp === 'number' && !isNaN(i.healHp) ? i.healHp : undefined,
                healWill: typeof i.healWill === 'number' && !isNaN(i.healWill) ? i.healWill : undefined,
                cures: Array.isArray(i.cures) ? (i.cures as string[]) : undefined,
                permanentStatBoost: (i.permanentStatBoost as InventoryItem['permanentStatBoost']) || undefined,
                permanentStatBoosts: Array.isArray(i.permanentStatBoosts)
                    ? (i.permanentStatBoosts as InventoryItem['permanentStatBoosts'])
                    : undefined,
                statBuff: (i.statBuff as InventoryItem['statBuff']) || undefined,
                statBuffs: Array.isArray(i.statBuffs) ? (i.statBuffs as InventoryItem['statBuffs']) : undefined,
                statDebuff: (i.statDebuff as InventoryItem['statDebuff']) || undefined,
                statDebuffs: Array.isArray(i.statDebuffs) ? (i.statDebuffs as InventoryItem['statDebuffs']) : undefined,
                gainTempHp: typeof i.gainTempHp === 'number' && !isNaN(i.gainTempHp) ? i.gainTempHp : undefined,
                gainTempWill: typeof i.gainTempWill === 'number' && !isNaN(i.gainTempWill) ? i.gainTempWill : undefined,
                dungeonPassive: typeof i.dungeonPassive === 'string' ? i.dungeonPassive : undefined,
                dungeonPassives: Array.isArray(i.dungeonPassives) ? (i.dungeonPassives as string[]) : undefined,
                inflictsStatus: Array.isArray(i.inflictsStatus) ? (i.inflictsStatus as string[]) : undefined,
                attackAction: (i.attackAction as ItemAttackAction) || undefined
            };
        });
    } catch (e) {
        console.warn('[StateMapper] Failed to parse inventory from metadata:', e);
        return [];
    }
}

export function parsePassives(meta: Record<string, unknown>): PassiveItem[] {
    try {
        const rawPassives = meta['passives-data'] ? JSON.parse(String(meta['passives-data'])) : [];
        if (!Array.isArray(rawPassives)) return [];

        return rawPassives.map((p: Record<string, unknown>) => ({
            id: (p.id as string) || crypto.randomUUID(),
            name: String(p.name || ''),
            desc: String(p.desc || p.description || p.effect || ''),
            active: p.active !== false && p.active !== 'false',
            showInConditions: p.showInConditions === true || p.showInConditions === 'true',
            showInRollLog: p.showInRollLog !== false && p.showInRollLog !== 'false',
            boostLevel: typeof p.boostLevel === 'number' ? p.boostLevel : undefined
        }));
    } catch (e) {
        console.warn('[StateMapper] Failed to parse passives from metadata:', e);
        return [];
    }
}

export function parseStatuses(meta: Record<string, unknown>): StatusItem[] {
    try {
        const rawStatuses = meta['status-list'] ? JSON.parse(String(meta['status-list'])) : [];
        if (Array.isArray(rawStatuses) && rawStatuses.length > 0) {
            return rawStatuses.map((s: Record<string, unknown>) => ({
                id: (s.id as string) || crypto.randomUUID(),
                name: String(s.name || s.Name || 'Healthy'),
                customName: String(s.customName || s.CustomName || ''),
                rounds: Number(s.rounds || 0)
            }));
        }
    } catch (e) {
        console.warn('[StateMapper] Failed to parse statuses from metadata:', e);
    }
    return [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }];
}

export function parseEffects(meta: Record<string, unknown>): EffectItem[] {
    try {
        const rawEffects = meta['effects-data'] ? JSON.parse(String(meta['effects-data'])) : [];
        if (!Array.isArray(rawEffects)) return [];

        return rawEffects.map((e: Record<string, unknown>) => ({
            id: (e.id as string) || crypto.randomUUID(),
            name: String(e.name || e.Name || ''),
            rounds: Number(e.rounds || 0)
        }));
    } catch (e) {
        console.warn('[StateMapper] Failed to parse effects from metadata:', e);
        return [];
    }
}

export function parseCustomInfo(meta: Record<string, unknown>): CustomInfo[] {
    try {
        const rawCustomInfo = meta['custom-info-data'] ? JSON.parse(String(meta['custom-info-data'])) : [];
        if (!Array.isArray(rawCustomInfo)) return [];

        return rawCustomInfo.map((c: Record<string, unknown>) => ({
            id: (c.id as string) || crypto.randomUUID(),
            label: String(c.label || c.Label || ''),
            value: String(c.value || c.Value || '')
        }));
    } catch (e) {
        console.warn('[StateMapper] Failed to parse custom info from metadata:', e);
        return [];
    }
}

export function parseBadges(meta: Record<string, unknown>): Badge[] {
    try {
        const rawBadges = meta['badges-data'] ? JSON.parse(String(meta['badges-data'])) : [];
        if (!Array.isArray(rawBadges)) return [];

        return rawBadges.map((b: Record<string, unknown>) => ({
            id: String(b.id || crypto.randomUUID()),
            name: String(b.name || ''),
            emoji: String(b.emoji || '🏅'),
            imageUrl: b.imageUrl ? String(b.imageUrl) : undefined
        }));
    } catch (e) {
        console.warn('[StateMapper] Failed to parse badges from metadata:', e);
        return [];
    }
}

export function parsePokedex(meta: Record<string, unknown>): TrainerPokedexData {
    try {
        const rawPokedex = meta['pokedex-data'] ? JSON.parse(String(meta['pokedex-data'])) : {};
        if (typeof rawPokedex !== 'object' || rawPokedex === null || Array.isArray(rawPokedex)) return {};

        const lowerToKeyMap: Record<string, string> = {};
        const result: TrainerPokedexData = {};
        for (const [rawKey, val] of Object.entries(rawPokedex)) {
            const cleanKey = rawKey.trim();
            if (!cleanKey) continue;
            const lower = cleanKey.toLowerCase();

            if (val && typeof val === 'object') {
                const entry = val as Record<string, unknown>;
                const entrySeen = Boolean(entry.seen || entry.caught || entry.shiny);
                const entryCaught = Boolean(entry.caught);
                const entryShiny = Boolean(entry.shiny);
                const entryBall = typeof entry.ball === 'string' && entry.ball.trim() ? entry.ball.trim() : undefined;

                if (!lowerToKeyMap[lower]) {
                    lowerToKeyMap[lower] = cleanKey;
                    result[cleanKey] = {
                        seen: entrySeen,
                        caught: entryCaught,
                        shiny: entryShiny,
                        ...(entryBall ? { ball: entryBall } : {})
                    };
                } else {
                    const existingKey = lowerToKeyMap[lower];
                    let activeKey = existingKey;
                    if (existingKey === lower && cleanKey !== lower) {
                        delete result[existingKey];
                        lowerToKeyMap[lower] = cleanKey;
                        activeKey = cleanKey;
                    }
                    const mergedBall = entryBall || result[activeKey]?.ball;
                    result[activeKey] = {
                        seen: Boolean(result[activeKey]?.seen || entrySeen),
                        caught: Boolean(result[activeKey]?.caught || entryCaught),
                        shiny: Boolean(result[activeKey]?.shiny || entryShiny),
                        ...(mergedBall ? { ball: mergedBall } : {})
                    };
                }
            }
        }
        return result;
    } catch (e) {
        console.warn('[StateMapper] Failed to parse pokedex from metadata:', e);
        return {};
    }
}

