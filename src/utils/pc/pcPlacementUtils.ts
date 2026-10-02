import type { Item } from '@owlbear-rodeo/sdk';
import type { TrainerRoster } from '../../types/pcStorageTypes';
import { METADATA_ID } from '../../hooks/owlbearSync/owlbearSyncConstants';

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
 */
export function resolveSpawnAnchorToken(
    trainer: TrainerRoster | undefined,
    sceneItems: Item[],
    activeTokenId?: string | null,
    selectedTokenIds?: string[]
): Item | undefined {
    // 1. Direct match with currently active character sheet token
    if (activeTokenId) {
        const byActive = sceneItems.find((it) => it.id === activeTokenId);
        if (byActive) return byActive;
    }

    // 2. Direct match with trainer mapTokenId
    if (trainer?.mapTokenId) {
        const byMap = sceneItems.find((it) => it.id === trainer.mapTokenId);
        if (byMap) return byMap;
    }

    // 3. Match from active selection
    if (selectedTokenIds && selectedTokenIds.length > 0) {
        const bySelection = sceneItems.find(
            (it) => it.id === selectedTokenIds[0] && (it.layer === 'CHARACTER' || it.layer === 'MOUNT')
        );
        if (bySelection) return bySelection;
    }

    if (!trainer || !trainer.name || trainer.name === 'None (PMD / Mystery Dungeon)') {
        return undefined;
    }

    const cleanTrainerName = trainer.name.trim().toLowerCase();

    // 4. Match by metadata name or token name
    const byName = sceneItems.find((it) => {
        const meta = (it.metadata?.[METADATA_ID] || it.metadata?.['pokerole-pmd-extension/stats']) as
            | Record<string, unknown>
            | undefined;
        if (!meta) return false;
        const metaName = String(meta.name || meta.nickname || '')
            .trim()
            .toLowerCase();
        const itName = String(it.name || '')
            .trim()
            .toLowerCase();
        return metaName === cleanTrainerName || itName === cleanTrainerName;
    });

    if (byName) return byName;

    // 5. Match by claimed-by metadata
    return sceneItems.find((it) => {
        const claim = it.metadata?.['pokerole-pmd-extension/claimed-by'] as { trainerName?: string } | undefined;
        return claim?.trainerName && claim.trainerName.trim().toLowerCase() === cleanTrainerName;
    });
}

/**
 * Searches in expanding concentric 2D grid rings around an anchor position to find the nearest
 * unoccupied tile. Guarantees spawned Pokémon never stack on top of each other.
 */
export function findOpenGridPosition(
    anchorPos: { x: number; y: number },
    gridDpi: number,
    sceneItems: Item[],
    maxRings = 8
): { x: number; y: number } {
    const obstaclePositions = sceneItems
        .filter((it) => it.layer === 'CHARACTER' || it.layer === 'PROP' || it.layer === 'MOUNT')
        .map((it) => getAbsoluteItemPosition(it, sceneItems));

    const minClearance = gridDpi * 0.7;

    const isOccupied = (x: number, y: number) => {
        return obstaclePositions.some((pos) => {
            const dx = pos.x - x;
            const dy = pos.y - y;
            return Math.sqrt(dx * dx + dy * dy) < minClearance;
        });
    };

    // First choice: directly 1 tile below the anchor
    const firstChoice = { x: anchorPos.x, y: anchorPos.y + gridDpi };
    if (!isOccupied(firstChoice.x, firstChoice.y)) {
        return firstChoice;
    }

    // Expand outwards in concentric grid rings
    for (let r = 1; r <= maxRings; r++) {
        const candidates: Array<{ x: number; y: number }> = [];

        // Ring perimeter coordinates
        for (let dx = -r; dx <= r; dx++) {
            candidates.push({ x: anchorPos.x + dx * gridDpi, y: anchorPos.y + r * gridDpi }); // bottom edge
            candidates.push({ x: anchorPos.x + dx * gridDpi, y: anchorPos.y - r * gridDpi }); // top edge
        }
        for (let dy = -r + 1; dy <= r - 1; dy++) {
            candidates.push({ x: anchorPos.x + r * gridDpi, y: anchorPos.y + dy * gridDpi }); // right edge
            candidates.push({ x: anchorPos.x - r * gridDpi, y: anchorPos.y + dy * gridDpi }); // left edge
        }

        // Sort candidates by closeness to downward-facing bias (natural formation)
        candidates.sort((a, b) => {
            const distA = Math.hypot(a.x - anchorPos.x, a.y - (anchorPos.y + gridDpi));
            const distB = Math.hypot(b.x - anchorPos.x, b.y - (anchorPos.y + gridDpi));
            return distA - distB;
        });

        for (const cand of candidates) {
            if (!isOccupied(cand.x, cand.y)) {
                return cand;
            }
        }
    }

    // Fallback: slight random scatter offset if entire search grid is packed
    const jitter = (Math.random() - 0.5) * gridDpi * 0.5;
    return { x: anchorPos.x + jitter, y: anchorPos.y + gridDpi + jitter };
}
