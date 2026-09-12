import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { extractCharacterName } from '../../../utils/initiativeHelpers';
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

export async function resolveCombatantTokenId(combatant: CombatantRowData): Promise<string | null> {
    if (combatant.tokenId) return combatant.tokenId;
    if (!combatant.name.trim()) return null;

    if (isStandaloneMode) {
        try {
            const localChars = await storageAdapter.getLocalCharacters();
            const match = localChars.find((c) => {
                const meta = (c.metadata || {}) as Record<string, unknown>;
                const resolvedName = extractCharacterName(meta, c.name);
                return (
                    resolvedName.toLowerCase().trim() === combatant.name.toLowerCase().trim() ||
                    c.name.toLowerCase().trim() === combatant.name.toLowerCase().trim()
                );
            });
            return match ? match.id : null;
        } catch (e) {
            console.warn('[battleOrganizerUtils] Failed to resolve standalone token ID:', e);
            return null;
        }
    }

    if (OBR.isAvailable) {
        try {
            const items = await OBR.scene.items.getItems((item) => {
                if (item.layer !== 'CHARACTER') return false;
                const meta = (item.metadata['pokerole-extension/stats'] || item.metadata) as Record<string, unknown>;
                const resolvedName = extractCharacterName(meta, item.name);
                return (
                    resolvedName.toLowerCase().trim() === combatant.name.toLowerCase().trim() ||
                    item.name.toLowerCase().trim() === combatant.name.toLowerCase().trim()
                );
            });
            return items.length > 0 ? items[0].id : null;
        } catch (e) {
            console.warn('[battleOrganizerUtils] Failed to resolve OBR token ID:', e);
            return null;
        }
    }

    return null;
}

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

export function parseRollLogEntry(logData: Record<string, unknown>): {
    rollId: string;
    charName: string;
    moveName: string;
    rollTokenId: string;
    isEvade: boolean;
    isClash: boolean;
    isDamageRoll: boolean;
    cleanLabel: string;
} | null {
    if (!logData) return null;
    const rollId = String(logData.id || '');
    const label = String(logData.label || logData.title || '');
    const fallbackCharName = String(logData.characterName || logData.player || '');
    const rollTokenId = String(logData.tokenId || '');

    const clean = label
        .replace(/^\[PRIVATE\]\s*/i, '')
        .replace(/^(?:📢|🎲|💥|🩹|🍀|🎯|🛡️|❄️)\s*/u, '')
        .trim();

    let charName = fallbackCharName;
    let moveName = '';

    // Format 1: "{Char} rolled {Move} (Acc)..." or "(Damage)" or "(Attack)" or "(Dmg)"
    const matchAccDmg = clean.match(/^(.+?)\s+rolled\s+(.+?)\s*\((?:Acc|Damage|Attack|Dmg)\)/i);
    if (matchAccDmg) {
        charName = matchAccDmg[1].trim();
        moveName = matchAccDmg[2].trim();
    } else {
        // Format 2: "{Char} rolled {Move}!"
        const matchRolled = clean.match(/^(.+?)\s+(?:rolled|used)\s+(.+?)(?:!|\s*\[|$)/i);
        if (matchRolled) {
            charName = matchRolled[1].trim();
            moveName = matchRolled[2].trim();
        } else {
            // Format 3: "{Move} (Acc)"
            const matchSimple = clean.match(/^(.+?)\s*(?:\(Acc\)|\(Damage\)|\(Attack\)|\(Dmg\))/i);
            if (matchSimple) {
                moveName = matchSimple[1].trim();
            } else if (clean && !clean.includes('!')) {
                moveName = clean.split('[')[0].trim();
            }
        }
    }

    if (!moveName || moveName.match(/^(?:custom dice|a General|Recovery|Check)/i)) {
        return null;
    }

    const isEvade = moveName.toLowerCase() === 'evade';
    const isClash = moveName.toLowerCase() === 'clash';
    const isDamageRoll = /\((?:Dmg|Damage)\)/i.test(clean) || String(logData.rollType || '') === 'damage';

    return {
        rollId,
        charName,
        moveName,
        rollTokenId,
        isEvade,
        isClash,
        isDamageRoll,
        cleanLabel: clean
    };
}

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
        entryHazard: '',
        cover: '',
        other: ''
    },
    foeSide: {
        forceFields: [
            { name: '', remainingRounds: 0 },
            { name: '', remainingRounds: 0 }
        ],
        entryHazard: '',
        cover: '',
        other: ''
    },
    playerTargets: '',
    foeTargets: '',
    highlightedSide: 'all'
});

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
