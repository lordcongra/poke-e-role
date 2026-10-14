import type { MoveFieldEffectDefinition } from './fieldEffectsData';

/**
 * Parses bracketed battlefield tags from move text or descriptions:
 * - [Force Field: Name, rounds] -> category: 'forceField'
 * - [(?:Hazard|Entry Hazard): Name] -> category: 'entryHazard', rounds: -1
 * - [Weather: Name, rounds] -> category: 'weather'
 * - [Terrain: Name, rounds] -> category: 'terrain'
 * - [(?:Battlefield|Field): Name, rounds] -> category: 'other'
 */
export function parseBattlefieldTagFromText(
    descOrText: string,
    defaultMoveName?: string
): MoveFieldEffectDefinition | null {
    if (!descOrText) return null;

    // 1. Force Field: [Force Field: Name, rounds]
    const ffMatch = descOrText.match(/\[Force Field:\s*([^,\]]+)(?:,\s*(-?\d+|scene))?\]/i);
    if (ffMatch) {
        const effectName = ffMatch[1].trim();
        const durationRaw = ffMatch[2]?.trim().toLowerCase();
        const rounds =
            durationRaw === 'scene' || durationRaw === '-1' ? -1 : durationRaw ? parseInt(durationRaw, 10) || 4 : 4;
        return {
            moveName: defaultMoveName || effectName,
            effectName,
            category: 'forceField',
            rounds
        };
    }

    // 2. Hazard / Entry Hazard: [(?:Hazard|Entry Hazard): Name]
    const hzMatch = descOrText.match(/\[(?:Hazard|Entry Hazard):\s*([^,\]]+)\]/i);
    if (hzMatch) {
        const effectName = hzMatch[1].trim();
        return {
            moveName: defaultMoveName || effectName,
            effectName,
            category: 'entryHazard',
            rounds: -1
        };
    }

    // 3. Weather: [Weather: Name, rounds]
    const wMatch = descOrText.match(/\[Weather:\s*([^,\]]+)(?:,\s*(-?\d+|scene))?\]/i);
    if (wMatch) {
        const effectName = wMatch[1].trim();
        const durationRaw = wMatch[2]?.trim().toLowerCase();
        const rounds =
            durationRaw === 'scene' || durationRaw === '-1' ? -1 : durationRaw ? parseInt(durationRaw, 10) || 4 : 4;
        return {
            moveName: defaultMoveName || effectName,
            effectName,
            category: 'weather',
            rounds
        };
    }

    // 4. Terrain: [Terrain: Name, rounds]
    const tMatch = descOrText.match(/\[Terrain:\s*([^,\]]+)(?:,\s*(-?\d+|scene))?\]/i);
    if (tMatch) {
        const effectName = tMatch[1].trim();
        const durationRaw = tMatch[2]?.trim().toLowerCase();
        const rounds =
            durationRaw === 'scene' || durationRaw === '-1' ? -1 : durationRaw ? parseInt(durationRaw, 10) || 4 : 4;
        return {
            moveName: defaultMoveName || effectName,
            effectName,
            category: 'terrain',
            rounds
        };
    }

    // 5. Battlefield / Field: [(?:Battlefield|Field): Name, rounds]
    const bfMatch = descOrText.match(/\[(?:Battlefield|Field):\s*([^,\]]+)(?:,\s*(-?\d+|scene))?\]/i);
    if (bfMatch) {
        const effectName = bfMatch[1].trim();
        const durationRaw = bfMatch[2]?.trim().toLowerCase();
        const rounds =
            durationRaw === 'scene' || durationRaw === '-1' ? -1 : durationRaw ? parseInt(durationRaw, 10) || 4 : 4;
        return {
            moveName: defaultMoveName || effectName,
            effectName,
            category: 'other',
            rounds
        };
    }

    return null;
}
