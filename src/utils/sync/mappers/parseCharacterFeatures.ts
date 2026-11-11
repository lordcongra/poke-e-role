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
import { mapAttr, mapSkill, parseFiniteNumber, parseOptionalFiniteNumber } from './mapperHelpers';

function mapValidItems<T>(raw: unknown, mapItem: (item: Record<string, unknown>, index: number) => T): T[] {
    if (!Array.isArray(raw)) return [];
    const results: T[] = [];
    for (let idx = 0; idx < raw.length; idx++) {
        const entry = raw[idx];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        try {
            results.push(mapItem(entry as Record<string, unknown>, idx));
        } catch (e) {
            console.warn('[StateMapper] Skipped malformed feature item at index', idx, e);
        }
    }
    return results;
}

function resolveItemId(rawId: unknown, prefix: string, index: number): string {
    if (typeof rawId === 'string' && rawId.trim() !== '') return rawId;
    if (typeof rawId === 'number' && Number.isFinite(rawId)) return String(rawId);
    return `${prefix}-${index}`;
}

export function parseMoves(meta: Record<string, unknown>, parsedExtraCats: ExtraCategory[]): MoveData[] {
    try {
        const rawMoves = meta['moves-data'] ? JSON.parse(String(meta['moves-data'])) : [];
        return mapValidItems(rawMoves, (m, idx) => {
            const rawCat = String(m.category || m.Category || 'Physical');
            const cat = rawCat.startsWith('Phys') ? 'Physical' : rawCat.startsWith('Spec') ? 'Special' : 'Status';

            const rawDmgCandidate = [m.dmg1, m.Damage1, m.Damage2]
                .filter((d) => d && d !== 'None' && String(d).trim() !== '')
                .join('/');

            return {
                id: resolveItemId(m.id, 'move', idx),
                active: m.active === true || m.active === 'true',
                name: String(m.name || m.Name || ''),
                type: String(m.type || m.Type || 'Normal'),
                category: cat as 'Physical' | 'Special' | 'Status',
                acc1: mapAttr(String(m.acc1 !== undefined ? m.acc1 : m.Accuracy1 || 'none')) || 'none',
                acc2: mapSkill(String(m.acc2 || m.Accuracy2 || 'none'), parsedExtraCats),
                dmg1: mapAttr(rawDmgCandidate),
                power: parseFiniteNumber(m.power !== undefined ? m.power : m.Power, 0),
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
        return mapValidItems(rawInv, (i, idx) => {
            const rawName = String(i.name || i.Name || '');
            let imageUrl = typeof i.imageUrl === 'string' ? i.imageUrl : undefined;
            if ((!imageUrl || imageUrl === 'none') && rawName) {
                const known = getItemArt(rawName);
                if (known) imageUrl = known;
            }
            const rawDesc = String(i.desc || i.Description || i.Effect || '');
            let tags = typeof i.tags === 'string' ? i.tags : '';
            let cleanDesc = rawDesc;

            // Legacy compatibility: Only extract [ ... ] bracket tags when i.tags is undefined,
            // preserving bracketed notes inside modern items that explicitly define tags (even "").
            if (i.tags === undefined) {
                const legacyMatches = Array.from(rawDesc.matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`);
                if (legacyMatches.length > 0) {
                    tags = Array.from(new Set(legacyMatches)).join(' ');
                    cleanDesc = rawDesc
                        .replace(/\[.*?\]/g, '')
                        .replace(/\n\s*\n+/g, '\n')
                        .trim();
                }
            }

            // Auto-tag known items if tags are empty!
            if (!tags && rawName) {
                const knownItemMatch = KNOWN_ITEMS.find((k) => k.name.toLowerCase() === rawName.toLowerCase());
                if (knownItemMatch?.tags) {
                    tags = knownItemMatch.tags;
                }
            }

            return {
                id: resolveItemId(i.id, 'inv', idx),
                qty: parseFiniteNumber(i.qty, 1),
                name: rawName,
                desc: cleanDesc,
                tags: tags || undefined,
                active: i.active === true || i.active === 'true',
                imageUrl,
                showInRollLog: i.showInRollLog !== false && i.showInRollLog !== 'false',
                boostLevel: parseOptionalFiniteNumber(i.boostLevel),
                charges: parseOptionalFiniteNumber(i.charges),
                maxCharges: parseOptionalFiniteNumber(i.maxCharges),
                destroyOnDepletion: typeof i.destroyOnDepletion === 'boolean' ? i.destroyOnDepletion : undefined,
                healHp: parseOptionalFiniteNumber(i.healHp),
                healWill: parseOptionalFiniteNumber(i.healWill),
                cures: Array.isArray(i.cures) ? (i.cures as string[]) : undefined,
                permanentStatBoost: (i.permanentStatBoost as InventoryItem['permanentStatBoost']) || undefined,
                permanentStatBoosts: Array.isArray(i.permanentStatBoosts)
                    ? (i.permanentStatBoosts as InventoryItem['permanentStatBoosts'])
                    : undefined,
                statBuff: (i.statBuff as InventoryItem['statBuff']) || undefined,
                statBuffs: Array.isArray(i.statBuffs) ? (i.statBuffs as InventoryItem['statBuffs']) : undefined,
                statDebuff: (i.statDebuff as InventoryItem['statDebuff']) || undefined,
                statDebuffs: Array.isArray(i.statDebuffs) ? (i.statDebuffs as InventoryItem['statDebuffs']) : undefined,
                gainTempHp: parseOptionalFiniteNumber(i.gainTempHp),
                gainTempWill: parseOptionalFiniteNumber(i.gainTempWill),
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
        return mapValidItems(rawPassives, (p, idx) => ({
            id: resolveItemId(p.id, 'passive', idx),
            name: String(p.name || ''),
            desc: String(p.desc || p.description || p.effect || ''),
            active: p.active !== false && p.active !== 'false',
            showInConditions: p.showInConditions === true || p.showInConditions === 'true',
            showInRollLog: p.showInRollLog !== false && p.showInRollLog !== 'false',
            boostLevel: parseOptionalFiniteNumber(p.boostLevel)
        }));
    } catch (e) {
        console.warn('[StateMapper] Failed to parse passives from metadata:', e);
        return [];
    }
}

export function parseStatuses(meta: Record<string, unknown>): StatusItem[] {
    try {
        const rawStatuses = meta['status-list'] ? JSON.parse(String(meta['status-list'])) : [];
        const parsed = mapValidItems(rawStatuses, (s, idx) => ({
            id: resolveItemId(s.id, 'status', idx),
            name: String(s.name || s.Name || 'Healthy'),
            customName: String(s.customName || s.CustomName || ''),
            rounds: parseFiniteNumber(s.rounds, 0)
        }));
        if (parsed.length > 0) return parsed;
    } catch (e) {
        console.warn('[StateMapper] Failed to parse statuses from metadata:', e);
    }
    return [{ id: 'status-default-healthy', name: 'Healthy', customName: '', rounds: 0 }];
}

export function parseEffects(meta: Record<string, unknown>): EffectItem[] {
    try {
        const rawEffects = meta['effects-data'] ? JSON.parse(String(meta['effects-data'])) : [];
        return mapValidItems(rawEffects, (e, idx) => ({
            id: resolveItemId(e.id, 'effect', idx),
            name: String(e.name || e.Name || ''),
            rounds: parseFiniteNumber(e.rounds, 0)
        }));
    } catch (e) {
        console.warn('[StateMapper] Failed to parse effects from metadata:', e);
        return [];
    }
}

export function parseCustomInfo(meta: Record<string, unknown>): CustomInfo[] {
    try {
        const rawCustomInfo = meta['custom-info-data'] ? JSON.parse(String(meta['custom-info-data'])) : [];
        return mapValidItems(rawCustomInfo, (c, idx) => ({
            id: resolveItemId(c.id, 'custom-info', idx),
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
        return mapValidItems(rawBadges, (b, idx) => ({
            id: resolveItemId(b.id, 'badge', idx),
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
                    const prevEntry = result[existingKey];
                    let activeKey = existingKey;
                    if (existingKey === lower && cleanKey !== lower) {
                        delete result[existingKey];
                        lowerToKeyMap[lower] = cleanKey;
                        activeKey = cleanKey;
                    }
                    const mergedBall = entryBall || prevEntry?.ball;
                    result[activeKey] = {
                        seen: Boolean(prevEntry?.seen || entrySeen),
                        caught: Boolean(prevEntry?.caught || entryCaught),
                        shiny: Boolean(prevEntry?.shiny || entryShiny),
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

