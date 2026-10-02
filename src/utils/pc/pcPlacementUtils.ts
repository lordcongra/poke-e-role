import type { Item } from '@owlbear-rodeo/sdk';
import type { TrainerRoster } from '../../types/pcStorageTypes';
import { METADATA_ID } from '../../hooks/owlbearSync/owlbearSyncConstants';

export const recentlySpawnedTokenIds = new Set<string>();

/**
 * Marks a token ID as having just been placed onto the map.
 * Prevents subsequent spawns within the same batch from mistakenly using this new token
 * as the anchor, which would cause an unintended vertical cascade.
 */
export function markTokenAsRecentlySpawned(id: string) {
    recentlySpawnedTokenIds.add(id);
    setTimeout(() => {
        recentlySpawnedTokenIds.delete(id);
    }, 4500);
}

interface PendingSpawn {
    x: number;
    y: number;
    timestamp: number;
}
const pendingSpawnPositions: PendingSpawn[] = [];

/**
 * Tracks an in-flight grid landing position to prevent rapid-click race conditions
 * where OBR.scene.items.getItems() has not yet caught up with newly added items.
 */
export function recordPendingSpawn(x: number, y: number) {
    const now = Date.now();
    pendingSpawnPositions.push({ x, y, timestamp: now });
    while (pendingSpawnPositions.length > 0 && now - pendingSpawnPositions[0].timestamp > 4000) {
        pendingSpawnPositions.shift();
    }
}

let sessionBatchAnchorPos: { x: number; y: number; timestamp: number } | null = null;

export function setBatchAnchorPos(pos: { x: number; y: number }) {
    sessionBatchAnchorPos = { x: pos.x, y: pos.y, timestamp: Date.now() };
}

export function getBatchAnchorPos(): { x: number; y: number } | null {
    if (sessionBatchAnchorPos && Date.now() - sessionBatchAnchorPos.timestamp < 15000) {
        return { x: sessionBatchAnchorPos.x, y: sessionBatchAnchorPos.y };
    }
    return null;
}

export function resetBatchAnchor() {
    sessionBatchAnchorPos = null;
}

/**
 * Traverses up any attachment hierarchy to compute the absolute world scene coordinates
 * for an item in Owlbear Rodeo.
 */
export function getAbsoluteItemPosition(item: Item, sceneItems: Item[]): { x: number; y: number } {
    let curr = item;
    let x = curr.position?.x ?? 0;
    let y = curr.position?.y ?? 0;

    let parentId = curr.attachedTo;
    const visited = new Set<string>([item.id]);

    while (parentId && !visited.has(parentId)) {
        visited.add(parentId);
        const parent = sceneItems.find((it) => it.id === parentId);
        if (!parent) break;
        x += parent.position?.x ?? 0;
        y += parent.position?.y ?? 0;
        parentId = parent.attachedTo;
    }

    return { x, y };
}

/**
 * Robustly finds the trainer or active character token on the scene to anchor spawns to.
 * Works seamlessly in Trainer mode, PMD mode, and across different layers or renames.
 * Guarantees that newly spawned Pokémon are never treated as the anchor.
 */
export function resolveSpawnAnchorToken(
    trainer: TrainerRoster | undefined,
    sceneItems: Item[],
    activeTokenId?: string | null,
    selectedTokenIds?: string[]
): Item | undefined {
    const isTrainerMode = Boolean(trainer && trainer.name && trainer.name !== 'None (PMD / Mystery Dungeon)');

    // 1. In Trainer mode: ALWAYS anchor to the Trainer token on the scene!
    if (isTrainerMode && trainer) {
        // Direct match with trainer mapTokenId
        if (trainer.mapTokenId) {
            const byMap = sceneItems.find((it) => it.id === trainer.mapTokenId);
            if (byMap) return byMap;
        }

        // Match with trainer savedTokenItem
        if (trainer.savedTokenItem?.id) {
            const bySaved = sceneItems.find((it) => it.id === trainer.savedTokenItem?.id);
            if (bySaved) return bySaved;
        }

        const cleanTrainerName = trainer.name.trim().toLowerCase();
        const matchesName = (str?: unknown) => {
            if (typeof str !== 'string' || !str.trim()) return false;
            const s = str.trim().toLowerCase();
            return s === cleanTrainerName || s.startsWith(cleanTrainerName) || cleanTrainerName.startsWith(s);
        };

        // Match by trainer metadata or token name
        const byTrainerMeta = sceneItems.find((it) => {
            const meta = (it.metadata?.[METADATA_ID] || it.metadata?.['pokerole-pmd-extension/stats']) as
                | Record<string, unknown>
                | undefined;
            if (!meta) return false;
            const isTrainer = meta.mode === 'Trainer' || meta.mode === 'Trainer (Special)' || meta.rank === 'Trainer';
            const metaName = String(meta.name || meta.nickname || '');
            const itName = String(it.name || '');
            return isTrainer && (matchesName(metaName) || matchesName(itName));
        });
        if (byTrainerMeta) return byTrainerMeta;

        // Match by token name across CHARACTER / MOUNT / PROP layers
        const byName = sceneItems.find((it) => {
            if (it.layer !== 'CHARACTER' && it.layer !== 'MOUNT' && it.layer !== 'PROP') return false;
            const meta = (it.metadata?.[METADATA_ID] || it.metadata?.['pokerole-pmd-extension/stats']) as
                | Record<string, unknown>
                | undefined;
            const metaName = String(meta?.name || meta?.nickname || '');
            const itName = String(it.name || '');
            return matchesName(metaName) || matchesName(itName);
        });
        if (byName) return byName;

        // Match by claimed-by metadata
        const byClaim = sceneItems.find((it) => {
            const claim = it.metadata?.['pokerole-pmd-extension/claimed-by'] as { trainerName?: string } | undefined;
            return claim?.trainerName && matchesName(claim.trainerName);
        });
        if (byClaim) return byClaim;

        // Fallback: match ANY token on scene marked as Trainer mode
        const anyTrainer = sceneItems.find((it) => {
            if (it.layer !== 'CHARACTER' && it.layer !== 'MOUNT') return false;
            const meta = (it.metadata?.[METADATA_ID] || it.metadata?.['pokerole-pmd-extension/stats']) as
                | Record<string, unknown>
                | undefined;
            return meta && (meta.mode === 'Trainer' || meta.mode === 'Trainer (Special)' || meta.rank === 'Trainer');
        });
        if (anyTrainer) return anyTrainer;
    }

    // 2. In PMD mode or if no trainer found: match with currently active character sheet token
    // Exclude tokens that were just spawned to prevent cascading vertical conga lines!
    if (activeTokenId && !recentlySpawnedTokenIds.has(activeTokenId)) {
        const byActive = sceneItems.find((it) => it.id === activeTokenId);
        if (byActive) return byActive;
    }

    // 3. Fallback to active selection if character/mount, skipping recently spawned tokens
    if (selectedTokenIds && selectedTokenIds.length > 0) {
        const validSelectedId = selectedTokenIds.find((id) => !recentlySpawnedTokenIds.has(id));
        if (validSelectedId) {
            const bySelection = sceneItems.find(
                (it) => it.id === validSelectedId && (it.layer === 'CHARACTER' || it.layer === 'MOUNT')
            );
            if (bySelection) return bySelection;
        }
    }

    return undefined;
}

/**
 * Finds the nearest open grid tile starting directly below the anchor, spreading
 * horizontally alternating left/right (0, -1, +1, -2, +2...) row-by-row.
 * Guarantees spawned Pokémon form neat horizontal battle lines and never stack.
 */
export function findOpenGridPosition(
    anchorPos: { x: number; y: number },
    gridDpi: number,
    sceneItems: Item[],
    maxHorizontalSpread = 6
): { x: number; y: number } {
    const obstaclePositions = sceneItems
        .filter((it) => it.layer === 'CHARACTER' || it.layer === 'PROP' || it.layer === 'MOUNT')
        .map((it) => getAbsoluteItemPosition(it, sceneItems));

    // Incorporate in-flight pending spawns to prevent race condition stacking
    const now = Date.now();
    for (const p of pendingSpawnPositions) {
        if (now - p.timestamp < 4000) {
            obstaclePositions.push({ x: p.x, y: p.y });
        }
    }

    const minClearance = gridDpi * 0.7;

    const isOccupied = (x: number, y: number) => {
        return obstaclePositions.some((pos) => {
            const dx = pos.x - x;
            const dy = pos.y - y;
            return Math.sqrt(dx * dx + dy * dy) < minClearance;
        });
    };

    // Horizontal alternating order: 0 (below), -1 (left), +1 (right), -2, +2, -3, +3...
    const xMultipliers: number[] = [0];
    for (let i = 1; i <= maxHorizontalSpread; i++) {
        xMultipliers.push(-i, i);
    }

    // Vertical rows: row 1 below (+1), row 2 below (+2), row 1 above (-1), row 3 below (+3)...
    const yMultipliers: number[] = [1, 2, -1, 3, -2, 4, -3, 5, -4];

    for (const dy of yMultipliers) {
        const rowY = anchorPos.y + dy * gridDpi;
        for (const dx of xMultipliers) {
            const candX = anchorPos.x + dx * gridDpi;
            if (!isOccupied(candX, rowY)) {
                recordPendingSpawn(candX, rowY);
                return { x: candX, y: rowY };
            }
        }
    }

    // Fallback: slight random scatter offset if entire grid search is packed
    const jitter = (Math.random() - 0.5) * gridDpi * 0.5;
    const fallbackPos = { x: anchorPos.x + jitter, y: anchorPos.y + gridDpi + jitter };
    recordPendingSpawn(fallbackPos.x, fallbackPos.y);
    return fallbackPos;
}
