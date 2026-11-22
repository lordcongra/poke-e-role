import {
    FATE_CHART,
    ODDS_LEVELS,
    EVENT_FOCUS_TABLE,
    ACTION_WORDS,
    THEME_WORDS,
    POKEMON_DISPOSITIONS,
    ENCOUNTER_TWISTS,
    WILDERNESS_HAZARDS,
    SETTLEMENT_RUMORS,
    RUIN_ANOMALIES,
    type EventFocusEntry
} from '@/data/soloOracleData';
export { ODDS_LEVELS } from '@/data/soloOracleData';
import { broadcastRollLog } from '@/utils/combat/rollLogSync';
import { useCharacterStore } from '@/store/useCharacterStore';
import type { RollSyncData } from '@/hooks/owlbearSync/owlbearSyncConstants';

export type FateResultType = 'Exceptional Yes' | 'Yes' | 'No' | 'Exceptional No';

export interface FateCheckResult {
    roll: number;
    odds: number;
    oddsLabel: string;
    chaosFactor: number;
    target: number;
    result: FateResultType;
    isRandomEvent: boolean;
    exceptionalYesThreshold: number | null;
    exceptionalNoThreshold: number | null;
}

export type PromptCategory = 'disposition' | 'twist' | 'hazard' | 'rumor' | 'ruin';

export interface CampaignData {
    chaosFactor: number;
    threads: string[];
    characters: string[];
    lastFateCheck?: FateCheckResult | null;
}

export interface SoloOracleState {
    chaosFactor: number;
    threads: string[];
    characters: string[];
    campaignData?: Record<string, CampaignData>;
    lastFateCheck?: FateCheckResult | null;
}

export const DEFAULT_SOLO_STATE: SoloOracleState = {
    chaosFactor: 5,
    threads: ['Find out what is agitating wild Pokémon in the area'],
    characters: ['Rival Trainer', 'Local Pokémon Professor'],
    campaignData: {
        'Main Campaign': {
            chaosFactor: 5,
            threads: ['Find out what is agitating wild Pokémon in the area'],
            characters: ['Rival Trainer', 'Local Pokémon Professor'],
            lastFateCheck: null
        }
    },
    lastFateCheck: null
};

export const SOLO_STORAGE_KEY = 'pkr_solo_oracle_state';

/**
 * Retrieves the campaign-specific data for a given campaign name with fallback.
 */
export function getCampaignData(state: SoloOracleState, campaign: string): CampaignData {
    if (state.campaignData && state.campaignData[campaign]) {
        return state.campaignData[campaign];
    }
    if (campaign === 'Main Campaign' && state.threads && state.characters) {
        return {
            chaosFactor: state.chaosFactor ?? 5,
            threads: state.threads,
            characters: state.characters,
            lastFateCheck: state.lastFateCheck ?? null
        };
    }
    return {
        chaosFactor: 5,
        threads: ['Find out what is agitating wild Pokémon in the area'],
        characters: ['Rival Trainer', 'Local Pokémon Professor'],
        lastFateCheck: null
    };
}

/**
 * Updates a specific campaign's data within the SoloOracleState.
 */
export function updateCampaignData(
    state: SoloOracleState,
    campaign: string,
    partial: Partial<CampaignData>
): SoloOracleState {
    const current = getCampaignData(state, campaign);
    const updatedCampaign: CampaignData = {
        ...current,
        ...partial
    };
    const nextCampaignData = {
        ...(state.campaignData || {}),
        [campaign]: updatedCampaign
    };

    return {
        ...state,
        ...(campaign === 'Main Campaign' ? updatedCampaign : {}),
        campaignData: nextCampaignData
    };
}

/**
 * Removes a campaign's data when the campaign is deleted.
 */
export function removeCampaignData(state: SoloOracleState, campaign: string): SoloOracleState {
    if (!state.campaignData || !state.campaignData[campaign]) return state;
    const nextCampaignData = { ...state.campaignData };
    delete nextCampaignData[campaign];
    return {
        ...state,
        campaignData: nextCampaignData
    };
}

/**
 * Retrieves the threshold boundaries for a given odds value (-4 to +4) and Chaos Factor (1 to 9).
 */
export function getFateThresholds(
    odds: number,
    chaosFactor: number
): {
    exceptionalYesThreshold: number | null;
    target: number;
    exceptionalNoThreshold: number | null;
} {
    const clampedOdds = Math.max(-4, Math.min(4, Math.round(odds)));
    const clampedChaos = Math.max(1, Math.min(9, Math.round(chaosFactor)));
    const row = FATE_CHART[clampedOdds];
    const cell = row ? row[clampedChaos - 1] : [10, 50, 91];

    return {
        exceptionalYesThreshold: cell[0],
        target: cell[1],
        exceptionalNoThreshold: cell[2]
    };
}

/**
 * Executes a Mythic GME 2e Fate Check against 1d100.
 * A matching double (11, 22, 33...) whose digit is <= chaosFactor triggers a Random Event.
 */
export function rollFateCheck(odds: number, chaosFactor: number, customRoll?: number): FateCheckResult {
    const clampedOdds = Math.max(-4, Math.min(4, Math.round(odds)));
    const clampedChaos = Math.max(1, Math.min(9, Math.round(chaosFactor)));
    const roll = customRoll !== undefined ? customRoll : Math.floor(Math.random() * 100) + 1;

    const { exceptionalYesThreshold, target, exceptionalNoThreshold } = getFateThresholds(clampedOdds, clampedChaos);

    let result: FateResultType = 'No';
    if (exceptionalYesThreshold !== null && roll <= exceptionalYesThreshold) {
        result = 'Exceptional Yes';
    } else if (roll <= target) {
        result = 'Yes';
    } else if (exceptionalNoThreshold !== null && roll >= exceptionalNoThreshold) {
        result = 'Exceptional No';
    } else {
        result = 'No';
    }

    const isDouble = roll > 0 && roll < 100 && roll % 11 === 0;
    const doubleDigit = isDouble ? roll / 11 : 0;
    const isRandomEvent = isDouble && doubleDigit <= clampedChaos;

    const oddsDef = ODDS_LEVELS.find((o) => o.odds === clampedOdds);
    const oddsLabel = oddsDef ? oddsDef.label : `${clampedOdds >= 0 ? '+' : ''}${clampedOdds}`;

    return {
        roll,
        odds: clampedOdds,
        oddsLabel,
        chaosFactor: clampedChaos,
        target,
        result,
        isRandomEvent,
        exceptionalYesThreshold,
        exceptionalNoThreshold
    };
}

/**
 * Rolls on the Event Focus table.
 */
export function rollEventFocus(customRoll?: number): { roll: number; entry: EventFocusEntry } {
    const roll = customRoll !== undefined ? customRoll : Math.floor(Math.random() * 100) + 1;
    const found = EVENT_FOCUS_TABLE.find((e) => roll >= e.min && roll <= e.max);
    const entry = found || EVENT_FOCUS_TABLE[0];
    return { roll, entry };
}

/**
 * Rolls a random Action word.
 */
export function rollActionWord(customRoll?: number): { roll: number; word: string } {
    const total = ACTION_WORDS.length;
    const roll = customRoll !== undefined ? customRoll : Math.floor(Math.random() * total) + 1;
    const index = Math.max(0, Math.min(total - 1, roll - 1));
    return { roll, word: ACTION_WORDS[index] };
}

/**
 * Rolls a random Theme word.
 */
export function rollThemeWord(customRoll?: number): { roll: number; word: string } {
    const total = THEME_WORDS.length;
    const roll = customRoll !== undefined ? customRoll : Math.floor(Math.random() * total) + 1;
    const index = Math.max(0, Math.min(total - 1, roll - 1));
    return { roll, word: THEME_WORDS[index] };
}

/**
 * Rolls an Action + Theme meaning pair.
 */
export function rollActionThemeCombo(
    customRollAction?: number,
    customRollTheme?: number
): {
    actionRoll: number;
    actionWord: string;
    themeRoll: number;
    themeWord: string;
    text: string;
} {
    const action = rollActionWord(customRollAction);
    const theme = rollThemeWord(customRollTheme);
    return {
        actionRoll: action.roll,
        actionWord: action.word,
        themeRoll: theme.roll,
        themeWord: theme.word,
        text: `${action.word} + ${theme.word}`
    };
}

/**
 * Rolls on Pokémon prompt tables.
 */
export function rollPokemonPrompt(
    category: PromptCategory,
    customRoll?: number
): { roll: number; category: PromptCategory; label: string; text: string } {
    let list: readonly string[];
    let label: string;

    switch (category) {
        case 'disposition':
            list = POKEMON_DISPOSITIONS;
            label = 'Wild Pokémon Disposition';
            break;
        case 'twist':
            list = ENCOUNTER_TWISTS;
            label = 'Encounter Twist';
            break;
        case 'hazard':
            list = WILDERNESS_HAZARDS;
            label = 'Wilderness Hazard';
            break;
        case 'rumor':
            list = SETTLEMENT_RUMORS;
            label = 'Settlement Rumor';
            break;
        case 'ruin':
            list = RUIN_ANOMALIES;
            label = 'Ruin Anomaly';
            break;
        default:
            list = POKEMON_DISPOSITIONS;
            label = 'Wild Pokémon Disposition';
            break;
    }

    const total = list.length;
    const roll = customRoll !== undefined ? customRoll : Math.floor(Math.random() * total) + 1;
    const index = Math.max(0, Math.min(total - 1, roll - 1));

    return {
        roll,
        category,
        label,
        text: list[index]
    };
}

/**
 * Formats a Fate Check into a RollSyncData payload and broadcasts it to the room/local roll log.
 */
export async function broadcastFateCheckRoll(fateResult: FateCheckResult, question?: string): Promise<void> {
    const characterName = useCharacterStore.getState().identity.nickname || 'Solo Oracle';
    const tokenId = useCharacterStore.getState().tokenId || undefined;

    const eventWarning = fateResult.isRandomEvent ? ' ⚡ [RANDOM EVENT]' : '';
    const rollDetails = `(d100: ${fateResult.roll} vs ${fateResult.target})`;
    const trimmedQuestion = question?.trim();
    const questionPrefix = trimmedQuestion ? `"${trimmedQuestion}" ➔ ` : '';

    const rollData: RollSyncData = {
        id: crypto.randomUUID(),
        player: 'Solo Oracle',
        characterName,
        tokenId,
        label: trimmedQuestion
            ? `Fate: "${trimmedQuestion}"`
            : `Fate Check: ${fateResult.oddsLabel} (Chaos ${fateResult.chaosFactor})`,
        result: `${questionPrefix}${fateResult.result}${eventWarning} ${rollDetails}`,
        icon: '🧭',
        rollType: 'solo-oracle',
        isCrit: fateResult.result === 'Exceptional Yes',
        isCritFail: fateResult.result === 'Exceptional No'
    };

    await broadcastRollLog(rollData);
}

/**
 * Formats a prompt or twist roll into a RollSyncData payload and broadcasts it.
 */
export async function broadcastPromptRoll(label: string, text: string, details?: string): Promise<void> {
    const characterName = useCharacterStore.getState().identity.nickname || 'Solo Oracle';
    const tokenId = useCharacterStore.getState().tokenId || undefined;

    const resultText = details ? `${text} [${details}]` : text;

    const rollData: RollSyncData = {
        id: crypto.randomUUID(),
        player: 'Solo Oracle',
        characterName,
        tokenId,
        label: `Oracle Prompt: ${label}`,
        result: resultText,
        icon: '✨',
        rollType: 'solo-prompt'
    };

    await broadcastRollLog(rollData);
}

/**
 * Reads the saved Solo Oracle state from localStorage with safe fallback.
 */
export function getStoredSoloOracleState(): SoloOracleState {
    try {
        const raw = localStorage.getItem(SOLO_STORAGE_KEY);
        if (!raw) return DEFAULT_SOLO_STATE;
        const parsed = JSON.parse(raw);
        return {
            chaosFactor: typeof parsed.chaosFactor === 'number' ? Math.max(1, Math.min(9, parsed.chaosFactor)) : 5,
            threads: Array.isArray(parsed.threads) ? parsed.threads : DEFAULT_SOLO_STATE.threads,
            characters: Array.isArray(parsed.characters) ? parsed.characters : DEFAULT_SOLO_STATE.characters,
            campaignData:
                parsed.campaignData && typeof parsed.campaignData === 'object' ? parsed.campaignData : undefined,
            lastFateCheck: parsed.lastFateCheck || null
        };
    } catch {
        return DEFAULT_SOLO_STATE;
    }
}

/**
 * Persists the Solo Oracle state to localStorage.
 */
export function saveStoredSoloOracleState(state: SoloOracleState): void {
    try {
        localStorage.setItem(SOLO_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('[SoloOracle] Failed to persist solo oracle state to localStorage:', e);
    }
}
