import { useCharacterStore } from '../../../store/useCharacterStore';
import { STATUS_OPTIONS } from '../../../data/constants';
import type { StatusItem } from '../../../store/storeTypes';
import type {
    BattleOrganizerState,
    BattlefieldData,
    CombatantRowData,
    ActionSlotData,
    BattleOrganizerTimerEffect,
    RollLogLayoutMode,
    BattleOrganizerSettings
} from '../../../types/battleOrganizerTypes';

export const STORAGE_KEY = 'pkr_battle_organizer_data';
export const LEGACY_OBR_SCENE_META_KEY = 'pokerole-pmd-extension/battle-organizer';

export function parseStatusesFromMetadata(meta: Record<string, unknown>): { statusText: string; isFainted: boolean } {
    let statusText = 'Healthy';
    try {
        const rawStatuses = meta['status-list'] ? JSON.parse(String(meta['status-list'])) : [];
        if (Array.isArray(rawStatuses)) {
            const nonHealthy = rawStatuses
                .filter((s: Record<string, unknown>) => s.name && s.name !== 'Healthy')
                .map((s: Record<string, unknown>) => {
                    const n = s.name === 'Custom...' ? String(s.customName || 'Custom') : String(s.name);
                    const r = Number(s.rounds || 0);
                    return r > 0 ? `${n} (${r})` : n;
                });
            if (nonHealthy.length > 0) statusText = nonHealthy.join(', ');
        }
    } catch (e) {
        console.warn('[battleOrganizerUtils] Failed to parse status list:', e);
    }
    const isFainted = statusText.toLowerCase().includes('faint');
    return { statusText, isFainted };
}

export function mapStatusTextToStatusItems(
    statusText: string,
    isFainted?: boolean,
    existingStatuses?: StatusItem[]
): StatusItem[] {
    const rawParts = (statusText || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== 'healthy');

    if (isFainted && !rawParts.some((p) => p.toLowerCase().includes('faint'))) {
        rawParts.push('Fainted');
    }

    if (rawParts.length === 0) {
        return [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }];
    }

    const roomCustoms = useCharacterStore.getState().roomCustomStatuses || [];

    return rawParts.map((part) => {
        // Extract optional rounds: e.g. "Paralysis (2)" -> baseName "Paralysis", rounds 2
        const roundMatch = part.match(/^(.*?)(?:\s*\((\d+)\))?$/);
        const baseName = (roundMatch ? roundMatch[1] : part).trim();
        const extractedRounds = roundMatch && roundMatch[2] ? parseInt(roundMatch[2], 10) : 0;

        // Look for existing status to preserve id and rounds if not in string
        const existing = existingStatuses?.find(
            (s) =>
                s.name.toLowerCase() === baseName.toLowerCase() ||
                (s.customName && s.customName.toLowerCase() === baseName.toLowerCase())
        );

        const finalRounds = extractedRounds > 0 ? extractedRounds : existing?.rounds || 0;

        // 1. Exact or case-insensitive match against STATUS_OPTIONS
        const matchedOption = STATUS_OPTIONS.find((opt) => opt.toLowerCase() === baseName.toLowerCase());
        if (matchedOption) {
            return {
                id: existing?.id || crypto.randomUUID(),
                name: matchedOption,
                customName: '',
                rounds: finalRounds
            };
        }

        // 2. Convenience aliases for common nicknames
        const lower = baseName.toLowerCase();
        if (lower === 'burn') {
            return {
                id: existing?.id || crypto.randomUUID(),
                name: '1st Degree Burn',
                customName: '',
                rounds: finalRounds
            };
        }
        if (lower === 'bad poison' || lower === 'toxic') {
            return {
                id: existing?.id || crypto.randomUUID(),
                name: 'Badly Poisoned',
                customName: '',
                rounds: finalRounds
            };
        }
        if (lower === 'freeze') {
            return {
                id: existing?.id || crypto.randomUUID(),
                name: 'Frozen Solid',
                customName: '',
                rounds: finalRounds
            };
        }

        // 3. Match against custom room statuses
        const matchedCustom = roomCustoms.find((cs) => cs.name.toLowerCase() === lower);
        if (matchedCustom) {
            return {
                id: existing?.id || crypto.randomUUID(),
                name: matchedCustom.name,
                customName: '',
                rounds: finalRounds
            };
        }

        // 4. Custom status / Fainted
        return {
            id: existing?.id || crypto.randomUUID(),
            name: baseName,
            customName: baseName,
            rounds: finalRounds
        };
    });
}

export {
    resolveCombatantTokenId,
    resolveCombatantLiveToken,
    resolveCombatantLiveTokenSync
} from '../../../utils/combat/combatantTokenResolver';

export function parseHealthAndWillFromMetadata(meta: Record<string, unknown>): {
    hpCurr: number;
    hpMax: number;
    willCurr: number;
    willMax: number;
    tempHp: number;
    tempWill: number;
    activeTransformation: string;
} {
    const hpCurr = meta['hp-curr'] !== undefined ? Number(meta['hp-curr']) : 0;
    const hpMax =
        meta['hp-max-display'] !== undefined
            ? Number(meta['hp-max-display'])
            : meta['hp-max'] !== undefined
              ? Number(meta['hp-max'])
              : 0;
    const willCurr = meta['will-curr'] !== undefined ? Number(meta['will-curr']) : 0;
    const willMax =
        meta['will-max-display'] !== undefined
            ? Number(meta['will-max-display'])
            : meta['will-max'] !== undefined
              ? Number(meta['will-max'])
              : 0;
    const tempHp = meta['temporary-hit-points'] !== undefined ? Number(meta['temporary-hit-points']) : 0;
    const tempWill = meta['temporary-will'] !== undefined ? Number(meta['temporary-will']) : 0;
    const activeTransformation = String(meta['active-transformation'] || meta['activeTransformation'] || 'None');

    return {
        hpCurr,
        hpMax,
        willCurr,
        willMax,
        tempHp,
        tempWill,
        activeTransformation
    };
}

export function parseTokenPrivacyFlags(
    meta: Record<string, unknown>,
    fallbackMeta?: Record<string, unknown>
): {
    gmHpBar: boolean;
    gmHpText: boolean;
    gmWillBar: boolean;
    gmWillText: boolean;
} {
    const m = meta || {};
    const fb = fallbackMeta || {};
    return {
        gmHpBar:
            m['gm-hp-bar'] === true ||
            m['gm-hp-bar'] === 'true' ||
            fb['gm-hp-bar'] === true ||
            fb['gm-hp-bar'] === 'true',
        gmHpText:
            m['gm-hp-text'] === true ||
            m['gm-hp-text'] === 'true' ||
            fb['gm-hp-text'] === true ||
            fb['gm-hp-text'] === 'true',
        gmWillBar:
            m['gm-will-bar'] === true ||
            m['gm-will-bar'] === 'true' ||
            fb['gm-will-bar'] === true ||
            fb['gm-will-bar'] === 'true',
        gmWillText:
            m['gm-will-text'] === true ||
            m['gm-will-text'] === 'true' ||
            fb['gm-will-text'] === true ||
            fb['gm-will-text'] === 'true'
    };
}

export function parseHeldItemsFromMetadata(meta: Record<string, unknown>): string {
    const heldItems: string[] = [];
    const combatSlot = typeof meta['combat'] === 'string' ? meta['combat'].trim() : '';
    const socialSlot = typeof meta['social'] === 'string' ? meta['social'].trim() : '';
    const handSlot = typeof meta['hand'] === 'string' ? meta['hand'].trim() : '';

    if (combatSlot) heldItems.push(combatSlot);
    if (socialSlot && !heldItems.includes(socialSlot)) heldItems.push(socialSlot);
    if (handSlot && !heldItems.includes(handSlot)) heldItems.push(handSlot);

    try {
        const rawInv = meta['inv-data'] ? JSON.parse(String(meta['inv-data'])) : [];
        if (Array.isArray(rawInv)) {
            rawInv
                .filter((i: Record<string, unknown>) => i.active === true || i.active === 'true')
                .map((i: Record<string, unknown>) => String(i.name || '').trim())
                .filter(Boolean)
                .forEach((itemName) => {
                    if (!heldItems.includes(itemName)) {
                        heldItems.push(itemName);
                    }
                });
        }
    } catch (e) {
        console.warn('[battleOrganizerUtils] Failed to parse inventory items:', e);
    }

    return heldItems.join(', ');
}

// Roll Log Classification & Parser
export * from './battleOrganizerRollParser';

export const createDefaultTimerEffect = (): BattleOrganizerTimerEffect => ({
    name: '',
    remainingRounds: 0
});

export const createDefaultActionSlot = (): ActionSlotData => ({
    text: '',
    status: 'none'
});

export const createDefaultActions = (): [
    ActionSlotData,
    ActionSlotData,
    ActionSlotData,
    ActionSlotData,
    ActionSlotData
] => [
    createDefaultActionSlot(),
    createDefaultActionSlot(),
    createDefaultActionSlot(),
    createDefaultActionSlot(),
    createDefaultActionSlot()
];

export const createDefaultCombatant = (name = '', image = '', isPlayer = true): CombatantRowData => ({
    id: crypto.randomUUID(),
    initiative: '',
    baseInit: 0,
    name,
    image,
    heldItem: '',
    status: 'Healthy',
    isFainted: false,
    actions: createDefaultActions(),
    evadeUsed: false,
    clashUsed: false,
    isPlayerSide: isPlayer,
    hpCurr: 0,
    hpMax: 0,
    willCurr: 0,
    willMax: 0,
    tempHp: 0,
    tempWill: 0,
    activeTransformation: 'None'
});

export function parseCombatantInitiativeHierarchy(
    initiativeStr: string,
    baseInitFallback?: number
): {
    total: number;
    baseInit: number;
    tiebreaker: number;
} {
    if (!initiativeStr || initiativeStr === '0') {
        return { total: 0, baseInit: baseInitFallback ?? 0, tiebreaker: 0 };
    }

    const parts = initiativeStr.split('.');
    const total = parseInt(parts[0], 10) || 0;

    let base = typeof baseInitFallback === 'number' ? baseInitFallback : 0;
    let tiebreaker = 0;

    if (parts.length > 1 && parts[1]) {
        const dec = parts[1];
        if (base > 0) {
            const baseStr = String(base);
            if (dec.startsWith(baseStr)) {
                const remainder = dec.slice(baseStr.length);
                if (remainder) {
                    tiebreaker = parseInt(remainder, 10) || 0;
                }
            } else {
                const parsedFloat = parseFloat(`0.${dec}`);
                const baseCandidate = Math.floor(parsedFloat * 100);
                if (baseCandidate > 0) {
                    base = baseCandidate;
                    tiebreaker = Math.round((parsedFloat * 100 - baseCandidate) * 100);
                }
            }
        } else {
            const num = parseInt(dec, 10) || 0;
            base = num;
        }
    }

    return { total, baseInit: base, tiebreaker };
}

export function compareCombatantsByInitiative(a: CombatantRowData, b: CombatantRowData): number {
    const aHierarchy = parseCombatantInitiativeHierarchy(a.initiative, a.baseInit);
    const bHierarchy = parseCombatantInitiativeHierarchy(b.initiative, b.baseInit);

    if (bHierarchy.total !== aHierarchy.total) {
        return bHierarchy.total - aHierarchy.total;
    }
    if (bHierarchy.baseInit !== aHierarchy.baseInit) {
        return bHierarchy.baseInit - aHierarchy.baseInit;
    }
    return bHierarchy.tiebreaker - aHierarchy.tiebreaker;
}

export const createDefaultBattlefield = (): BattlefieldData => ({
    location: '',
    weather: { name: '', remainingRounds: 0 },
    terrain: { name: '', remainingRounds: 0 },
    other: { name: '', remainingRounds: 0 },
    playerSide: {
        forceFields: [
            { name: '', remainingRounds: 0 },
            { name: '', remainingRounds: 0 }
        ],
        extraForceFields: [],
        entryHazard: '',
        extraHazards: [],
        cover: '',
        other: '',
        extraOther: []
    },
    foeSide: {
        forceFields: [
            { name: '', remainingRounds: 0 },
            { name: '', remainingRounds: 0 }
        ],
        extraForceFields: [],
        entryHazard: '',
        extraHazards: [],
        cover: '',
        other: '',
        extraOther: []
    },
    playerTargets: '',
    foeTargets: '',
    highlightedSide: 'all'
});

export const sanitizeBattlefield = (raw?: Partial<BattlefieldData> | null): BattlefieldData => {
    const def = createDefaultBattlefield();
    if (!raw) return def;
    const sanitizeSide = (
        side?: Partial<BattlefieldData['playerSide']> | null,
        defaultSide = def.playerSide
    ): BattlefieldData['playerSide'] => {
        if (!side) return defaultSide;
        const ff0 = side.forceFields?.[0] ?? defaultSide.forceFields[0];
        const ff1 = side.forceFields?.[1] ?? defaultSide.forceFields[1];
        return {
            ...defaultSide,
            ...side,
            forceFields: [
                { name: ff0?.name ?? '', remainingRounds: ff0?.remainingRounds ?? 0 },
                { name: ff1?.name ?? '', remainingRounds: ff1?.remainingRounds ?? 0 }
            ],
            extraForceFields: Array.isArray(side.extraForceFields) ? side.extraForceFields : [],
            extraHazards: Array.isArray(side.extraHazards) ? side.extraHazards : [],
            extraOther: Array.isArray(side.extraOther) ? side.extraOther : []
        };
    };

    return {
        ...def,
        ...raw,
        weather: {
            name: raw.weather?.name ?? def.weather.name,
            remainingRounds: raw.weather?.remainingRounds ?? def.weather.remainingRounds
        },
        terrain: {
            name: raw.terrain?.name ?? def.terrain.name,
            remainingRounds: raw.terrain?.remainingRounds ?? def.terrain.remainingRounds
        },
        other: {
            name: raw.other?.name ?? def.other.name,
            remainingRounds: raw.other?.remainingRounds ?? def.other.remainingRounds
        },
        extraWeathers: Array.isArray(raw.extraWeathers) ? raw.extraWeathers : [],
        extraTerrains: Array.isArray(raw.extraTerrains) ? raw.extraTerrains : [],
        extraOther: Array.isArray(raw.extraOther) ? raw.extraOther : [],
        playerSide: sanitizeSide(raw.playerSide, def.playerSide),
        foeSide: sanitizeSide(raw.foeSide, def.foeSide)
    };
};

export const createDefaultState = (): BattleOrganizerState => ({
    battlefield: createDefaultBattlefield(),
    rounds: [
        {
            id: crypto.randomUUID(),
            roundNumber: 1,
            combatants: [
                createDefaultCombatant('', '', true),
                createDefaultCombatant('', '', true),
                createDefaultCombatant('', '', false),
                createDefaultCombatant('', '', false)
            ],
            endOfRoundEffects: ''
        }
    ],
    activeRoundIndex: 0
});

export function getRollLogModeLabel(mode?: RollLogLayoutMode): string {
    switch (mode) {
        case 'full-sidebar':
            return 'Side-by-Side (Full Length)';
        case 'battlefield-nested':
            return 'Side-by-Side (Battlefield Only)';
        case 'rounds-nested':
            return 'Side-by-Side (Round Tracker Only)';
        case 'floating':
        default:
            return 'Floating Overlay';
    }
}

export function getRollLogModeShortLabel(mode?: RollLogLayoutMode): string {
    switch (mode) {
        case 'full-sidebar':
            return 'Full Side';
        case 'battlefield-nested':
            return 'Field Only';
        case 'rounds-nested':
            return 'Rounds Only';
        case 'floating':
        default:
            return 'Float';
    }
}

export function markCombatantActionStatus(
    combatant: CombatantRowData,
    moveName: string,
    status: 'success' | 'failed'
): CombatantRowData {
    let targetIdx = combatant.actions.findIndex(
        (a) => a.text.trim().toLowerCase() === moveName.trim().toLowerCase() && a.status === 'none'
    );
    if (targetIdx === -1) {
        targetIdx = combatant.actions.findIndex((a) => a.text.trim().toLowerCase() === moveName.trim().toLowerCase());
    }
    if (targetIdx === -1) {
        targetIdx = combatant.actions.findIndex((a) => !a.text.trim());
    }
    if (targetIdx === -1) targetIdx = 0;

    const newActions = [...combatant.actions] as CombatantRowData['actions'];
    newActions[targetIdx] = {
        text: newActions[targetIdx].text.trim() || moveName,
        status: status
    };

    return {
        ...combatant,
        actions: newActions
    };
}

export function openBattleOrganizerPopout(boSettings: BattleOrganizerSettings): void {
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const themeToPass = document.body.getAttribute('data-theme') || 'dark';

    const computedStyle = getComputedStyle(document.documentElement);
    let primaryColor =
        document.documentElement.style.getPropertyValue('--dynamic-type-color') ||
        document.body.style.getPropertyValue('--dynamic-type-color') ||
        computedStyle.getPropertyValue('--dynamic-type-color') ||
        '';
    let secondaryColor =
        document.documentElement.style.getPropertyValue('--dynamic-secondary-color') ||
        document.body.style.getPropertyValue('--dynamic-secondary-color') ||
        computedStyle.getPropertyValue('--dynamic-secondary-color') ||
        '';

    if (!primaryColor.trim()) {
        try {
            const sheetColors = localStorage.getItem('pkr_sheet_theme_colors');
            if (sheetColors) {
                const parsed = JSON.parse(sheetColors);
                if (parsed?.primary) primaryColor = parsed.primary;
                if (parsed?.secondary) secondaryColor = parsed.secondary || '';
            }
        } catch {
            // ignore
        }
    }
    if (!primaryColor.trim()) {
        try {
            const activeColors = localStorage.getItem('pkr_active_theme_colors');
            if (activeColors) {
                const parsed = JSON.parse(activeColors);
                if (parsed?.primary) primaryColor = parsed.primary;
                if (parsed?.secondary) secondaryColor = parsed.secondary || '';
            }
        } catch {
            // ignore
        }
    }

    const currentRole = useCharacterStore.getState().role;
    const urlParams = new URLSearchParams();
    urlParams.set('theme', themeToPass);
    if (currentRole) urlParams.set('role', currentRole);
    if (primaryColor.trim()) urlParams.set('primary', primaryColor.trim());
    if (secondaryColor.trim()) urlParams.set('secondary', secondaryColor.trim());

    if (primaryColor.trim()) {
        try {
            localStorage.setItem(
                'pkr_sheet_theme_colors',
                JSON.stringify({
                    primary: primaryColor.trim(),
                    secondary: secondaryColor.trim() || undefined
                })
            );
            localStorage.setItem(
                'pkr_active_theme_colors',
                JSON.stringify({
                    enabled: true,
                    primary: primaryColor.trim(),
                    secondary: secondaryColor.trim() || undefined
                })
            );
        } catch {
            // ignore
        }
    }

    const url = `${baseUrl}/battle-organizer.html?${urlParams.toString()}`;

    let width = 1360;
    let height = 880;
    if (boSettings.showBattlefield && !boSettings.showRoundTracker) {
        width = 1040;
        height = 620;
    } else if (!boSettings.showBattlefield && boSettings.showRoundTracker) {
        width = 1200;
        height = 760;
    }

    window.open(
        url,
        'pkr-battle-organizer-window',
        `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );
}

export function adjustCombatantHp(combatant: CombatantRowData, delta: number): Partial<CombatantRowData> {
    const curr = combatant.hpCurr ?? 0;
    const max = combatant.hpMax && combatant.hpMax > 0 ? combatant.hpMax : 999;
    let nextHp = curr;
    let nextTempHp = combatant.tempHp ?? 0;

    if (delta < 0) {
        const damage = Math.abs(delta);
        if (nextTempHp > 0) {
            const absorbed = Math.min(nextTempHp, damage);
            const remainingDamage = damage - absorbed;
            nextTempHp = nextTempHp - absorbed;
            nextHp = Math.max(0, curr - remainingDamage);
        } else {
            nextHp = Math.max(0, curr - damage);
        }
    } else if (delta > 0) {
        nextHp = Math.max(0, Math.min(max, curr + delta));
    }

    const nextFainted = nextHp <= 0 ? true : combatant.isFainted;
    let nextStatus = combatant.status || 'Healthy';
    if (nextHp <= 0 && !nextStatus.toLowerCase().includes('faint')) {
        nextStatus = nextStatus === 'Healthy' ? 'Fainted' : `${nextStatus}, Fainted`;
    }
    return {
        hpCurr: nextHp,
        tempHp: nextTempHp,
        isFainted: nextFainted,
        status: nextStatus
    };
}

export function adjustCombatantWill(combatant: CombatantRowData, delta: number): Partial<CombatantRowData> {
    const curr = combatant.willCurr ?? 0;
    const max = combatant.willMax && combatant.willMax > 0 ? combatant.willMax : 999;
    let nextWill = curr;
    let nextTempWill = combatant.tempWill ?? 0;

    if (delta < 0) {
        const drain = Math.abs(delta);
        if (nextTempWill > 0) {
            const absorbed = Math.min(nextTempWill, drain);
            const remainingDrain = drain - absorbed;
            nextTempWill = nextTempWill - absorbed;
            nextWill = Math.max(0, curr - remainingDrain);
        } else {
            nextWill = Math.max(0, curr - drain);
        }
    } else if (delta > 0) {
        nextWill = Math.max(0, Math.min(max, curr + delta));
    }

    return {
        willCurr: nextWill,
        tempWill: nextTempWill
    };
}

export function toggleCombatantFainted(combatant: CombatantRowData): Partial<CombatantRowData> {
    const nextFainted = !combatant.isFainted;
    let newStatus = combatant.status || '';
    if (nextFainted) {
        if (!newStatus.trim() || newStatus === 'Healthy') {
            newStatus = 'Fainted';
        } else if (!newStatus.includes('Fainted')) {
            newStatus = `${newStatus}, Fainted`;
        }
    } else {
        newStatus = newStatus
            .replace(/,?\s*Fainted\s*,?/gi, '')
            .replace(/^,\s*|,\s*$/g, '')
            .trim();
        if (!newStatus) newStatus = 'Healthy';
    }
    return {
        isFainted: nextFainted,
        status: newStatus
    };
}
