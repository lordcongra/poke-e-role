import type { PcPokemonSummary, SheetFieldDiff } from '../../types/pcStorageTypes';

interface MoveLike {
    name?: string;
    Name?: string;
    [key: string]: unknown;
}

function parseMoveNames(meta?: Record<string, unknown>): string[] {
    if (!meta) return [];
    try {
        const raw = meta['moves-data'];
        if (typeof raw === 'string') {
            const parsed = JSON.parse(raw) as MoveLike[];
            if (Array.isArray(parsed)) {
                return parsed.map((m) => m.name || m.Name || '').filter(Boolean);
            }
        } else if (Array.isArray(raw)) {
            return (raw as MoveLike[]).map((m) => m.name || m.Name || '').filter(Boolean);
        }
    } catch {}
    return [];
}

/**
 * Computes deep field differences between a GM's existing Pokémon summary and an incoming
 * player summary (stats, health, will, rank, typing, items, and moveset).
 */
export function computeSheetFieldDiffs(existing: PcPokemonSummary, incoming: PcPokemonSummary): SheetFieldDiff[] {
    const diffs: SheetFieldDiff[] = [];

    // 1. Identity & Rank
    if (existing.rank !== incoming.rank) {
        diffs.push({
            id: 'rank',
            category: 'identity',
            label: 'Rank',
            gmValue: existing.rank,
            playerValue: incoming.rank,
            accepted: true
        });
    }

    if (existing.name !== incoming.name) {
        diffs.push({
            id: 'name',
            category: 'identity',
            label: 'Nickname',
            gmValue: existing.name,
            playerValue: incoming.name,
            accepted: true
        });
    }

    if (existing.species !== incoming.species) {
        diffs.push({
            id: 'species',
            category: 'identity',
            label: 'Species',
            gmValue: existing.species,
            playerValue: incoming.species,
            accepted: true
        });
    }

    if (existing.type1 !== incoming.type1) {
        diffs.push({
            id: 'type1',
            category: 'identity',
            label: 'Primary Type',
            gmValue: existing.type1,
            playerValue: incoming.type1,
            accepted: true
        });
    }

    if ((existing.type2 || 'None') !== (incoming.type2 || 'None')) {
        diffs.push({
            id: 'type2',
            category: 'identity',
            label: 'Secondary Type',
            gmValue: existing.type2 || 'None',
            playerValue: incoming.type2 || 'None',
            accepted: true
        });
    }

    // 2. Health & Will pools
    if (existing.maxHp !== incoming.maxHp) {
        diffs.push({
            id: 'maxHp',
            category: 'stats',
            label: 'Max HP',
            gmValue: existing.maxHp,
            playerValue: incoming.maxHp,
            accepted: true
        });
    }

    if (existing.hp !== incoming.hp) {
        diffs.push({
            id: 'hp',
            category: 'stats',
            label: 'Current HP',
            gmValue: existing.hp,
            playerValue: incoming.hp,
            accepted: true
        });
    }

    if (existing.maxWill !== incoming.maxWill) {
        diffs.push({
            id: 'maxWill',
            category: 'stats',
            label: 'Max Will',
            gmValue: existing.maxWill,
            playerValue: incoming.maxWill,
            accepted: true
        });
    }

    if (existing.will !== incoming.will) {
        diffs.push({
            id: 'will',
            category: 'stats',
            label: 'Current Will',
            gmValue: existing.will,
            playerValue: incoming.will,
            accepted: true
        });
    }

    // 3. Held Item
    if ((existing.heldItem || 'None') !== (incoming.heldItem || 'None')) {
        diffs.push({
            id: 'heldItem',
            category: 'items',
            label: 'Held Item',
            gmValue: existing.heldItem || 'None',
            playerValue: incoming.heldItem || 'None',
            accepted: true
        });
    }

    // 4. Base Attributes in fullMetadata
    const eMeta = existing.fullMetadata || {};
    const iMeta = incoming.fullMetadata || {};

    const statsToCheck: Array<{ key: string; label: string }> = [
        { key: 'str-base', label: 'Strength' },
        { key: 'dex-base', label: 'Dexterity' },
        { key: 'vit-base', label: 'Vitality' },
        { key: 'spe-base', label: 'Special' },
        { key: 'ins-base', label: 'Insight' }
    ];

    for (const stat of statsToCheck) {
        const eVal = Number(eMeta[stat.key] ?? 1);
        const iVal = Number(iMeta[stat.key] ?? 1);
        if (eVal !== iVal) {
            diffs.push({
                id: `meta-${stat.key}`,
                category: 'stats',
                label: stat.label,
                gmValue: eVal,
                playerValue: iVal,
                accepted: true
            });
        }
    }

    // 5. Moveset comparison
    const eMoves = parseMoveNames(eMeta);
    const iMoves = parseMoveNames(iMeta);
    const areMovesEqual =
        eMoves.length === iMoves.length && eMoves.every((val, idx) => val.toLowerCase() === iMoves[idx].toLowerCase());

    if (!areMovesEqual && (eMoves.length > 0 || iMoves.length > 0)) {
        diffs.push({
            id: 'moves',
            category: 'moves',
            label: 'Moveset',
            gmValue: eMoves.join(', ') || 'None',
            playerValue: iMoves.join(', ') || 'None',
            accepted: true
        });
    }

    return diffs;
}

/**
 * Applies GM-accepted diffs onto a Pokémon summary.
 */
export function applyReviewDiffsToSummary(
    summary: PcPokemonSummary,
    diffs: SheetFieldDiff[],
    incoming?: PcPokemonSummary
): PcPokemonSummary {
    const updated = { ...summary };
    const updatedMeta = { ...(updated.fullMetadata || {}) };

    for (const diff of diffs) {
        if (!diff.accepted) continue;

        if (diff.id === 'hp') updated.hp = Number(diff.playerValue);
        else if (diff.id === 'maxHp') updated.maxHp = Number(diff.playerValue);
        else if (diff.id === 'will') updated.will = Number(diff.playerValue);
        else if (diff.id === 'maxWill') updated.maxWill = Number(diff.playerValue);
        else if (diff.id === 'name') updated.name = String(diff.playerValue);
        else if (diff.id === 'species') updated.species = String(diff.playerValue);
        else if (diff.id === 'rank') updated.rank = String(diff.playerValue);
        else if (diff.id === 'type1') updated.type1 = String(diff.playerValue);
        else if (diff.id === 'type2')
            updated.type2 = diff.playerValue === 'None' ? undefined : String(diff.playerValue);
        else if (diff.id === 'heldItem')
            updated.heldItem = diff.playerValue === 'None' ? undefined : String(diff.playerValue);
        else if (diff.id.startsWith('meta-')) {
            const metaKey = diff.id.replace('meta-', '');
            updatedMeta[metaKey] = Number(diff.playerValue);
        } else if (diff.id === 'moves' && incoming?.fullMetadata?.['moves-data']) {
            updatedMeta['moves-data'] = incoming.fullMetadata['moves-data'];
        }
    }

    updated.fullMetadata = updatedMeta;
    updated.lastModified = Date.now();
    return updated;
}
