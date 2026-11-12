import type {
    CustomType,
    CustomAbility,
    CustomMove,
    CustomPokemon,
    CustomItem,
    CustomForm,
    CustomStatus,
    CustomFieldEffect
} from '@/store/storeTypes';
import { normalizeCustomForm } from '@/store/slices/homebrew/homebrewEntityUtils';

export interface HomebrewStorageData {
    customTypes: CustomType[];
    customAbilities: CustomAbility[];
    customMoves: CustomMove[];
    customPokemon: CustomPokemon[];
    customItems: CustomItem[];
    customForms: CustomForm[];
    customStatuses: CustomStatus[];
    customFieldEffects?: CustomFieldEffect[];
    needsBackup?: boolean;
    updatedAt?: number;
}

const HOMEBREW_ARRAY_KEYS = [
    'customTypes',
    'customAbilities',
    'customMoves',
    'customPokemon',
    'customItems',
    'customForms',
    'customStatuses',
    'customFieldEffects'
] as const;

function isPlainObject(val: unknown): val is Record<string, unknown> {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function hasNonEmptyString(val: unknown): val is string {
    return typeof val === 'string' && val.trim().length > 0;
}

function toStringArray(val: unknown): string[] {
    return Array.isArray(val) ? val.filter((entry): entry is string => typeof entry === 'string') : [];
}

function toFiniteNumber(val: unknown, fallback: number): number {
    return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
}

function ensureId(val: unknown): string {
    return hasNonEmptyString(val) ? val : crypto.randomUUID();
}

function sanitizeArray<T>(raw: unknown, mapper: (obj: Record<string, unknown>) => T | null): T[] {
    if (!Array.isArray(raw)) return [];
    const result: T[] = [];
    for (const item of raw) {
        if (!isPlainObject(item)) continue;
        const sanitized = mapper(item);
        if (sanitized !== null) {
            result.push(sanitized);
        }
    }
    return result;
}

function sanitizeCustomType(obj: Record<string, unknown>): CustomType | null {
    if (!hasNonEmptyString(obj.name)) return null;
    return {
        ...(obj as unknown as CustomType),
        id: hasNonEmptyString(obj.id) ? obj.id : undefined,
        name: obj.name,
        color: hasNonEmptyString(obj.color) ? obj.color : '#888888',
        weaknesses: toStringArray(obj.weaknesses),
        resistances: toStringArray(obj.resistances),
        immunities: toStringArray(obj.immunities),
        seAgainst: toStringArray(obj.seAgainst),
        nveAgainst: toStringArray(obj.nveAgainst),
        noEffectAgainst: toStringArray(obj.noEffectAgainst)
    };
}

function sanitizeCustomAbility(obj: Record<string, unknown>): CustomAbility | null {
    if (!hasNonEmptyString(obj.name)) return null;
    return {
        ...(obj as unknown as CustomAbility),
        id: ensureId(obj.id),
        name: obj.name,
        description: typeof obj.description === 'string' ? obj.description : '',
        effect: typeof obj.effect === 'string' ? obj.effect : ''
    };
}

function sanitizeCustomMove(obj: Record<string, unknown>): CustomMove | null {
    if (!hasNonEmptyString(obj.name)) return null;
    const category =
        obj.category === 'Physical' || obj.category === 'Special' || obj.category === 'Status'
            ? obj.category
            : 'Physical';
    return {
        ...(obj as unknown as CustomMove),
        id: ensureId(obj.id),
        name: obj.name,
        type: hasNonEmptyString(obj.type) ? obj.type : 'Normal',
        category,
        power: toFiniteNumber(obj.power, 0),
        acc1: typeof obj.acc1 === 'string' ? obj.acc1 : '',
        acc2: typeof obj.acc2 === 'string' ? obj.acc2 : '',
        dmg1: typeof obj.dmg1 === 'string' ? obj.dmg1 : '',
        desc: typeof obj.desc === 'string' ? obj.desc : ''
    };
}

function sanitizeCustomPokemon(obj: Record<string, unknown>): CustomPokemon | null {
    if (!hasNonEmptyString(obj.Name)) return null;
    const moves = Array.isArray(obj.Moves)
        ? obj.Moves.filter(
              (m): m is { Learned?: unknown; Name: string } => isPlainObject(m) && hasNonEmptyString(m.Name)
          ).map((m) => ({
              Learned: typeof m.Learned === 'string' ? m.Learned : 'Starter',
              Name: m.Name
          }))
        : [];
    return {
        ...(obj as unknown as CustomPokemon),
        id: ensureId(obj.id),
        Name: obj.Name,
        Type1: hasNonEmptyString(obj.Type1) ? obj.Type1 : 'Normal',
        Type2: typeof obj.Type2 === 'string' ? obj.Type2 : '',
        BaseHP: toFiniteNumber(obj.BaseHP, 4),
        Strength: toFiniteNumber(obj.Strength, 1),
        MaxStrength: toFiniteNumber(obj.MaxStrength, 5),
        Dexterity: toFiniteNumber(obj.Dexterity, 1),
        MaxDexterity: toFiniteNumber(obj.MaxDexterity, 5),
        Vitality: toFiniteNumber(obj.Vitality, 1),
        MaxVitality: toFiniteNumber(obj.MaxVitality, 5),
        Special: toFiniteNumber(obj.Special, 1),
        MaxSpecial: toFiniteNumber(obj.MaxSpecial, 5),
        Insight: toFiniteNumber(obj.Insight, 1),
        MaxInsight: toFiniteNumber(obj.MaxInsight, 5),
        Ability1: typeof obj.Ability1 === 'string' ? obj.Ability1 : '',
        Ability2: typeof obj.Ability2 === 'string' ? obj.Ability2 : '',
        HiddenAbility: typeof obj.HiddenAbility === 'string' ? obj.HiddenAbility : '',
        EventAbilities: typeof obj.EventAbilities === 'string' ? obj.EventAbilities : '',
        ExtraAbilities: obj.ExtraAbilities !== undefined ? toStringArray(obj.ExtraAbilities) : undefined,
        Moves: moves
    };
}

function sanitizeCustomItem(obj: Record<string, unknown>): CustomItem | null {
    if (!hasNonEmptyString(obj.name)) return null;
    return {
        ...(obj as unknown as CustomItem),
        id: ensureId(obj.id),
        name: obj.name,
        description: typeof obj.description === 'string' ? obj.description : '',
        cures: obj.cures !== undefined ? toStringArray(obj.cures) : undefined,
        dungeonPassives: obj.dungeonPassives !== undefined ? toStringArray(obj.dungeonPassives) : undefined,
        inflictsStatus: obj.inflictsStatus !== undefined ? toStringArray(obj.inflictsStatus) : undefined
    };
}

function sanitizeCustomForm(obj: Record<string, unknown>): CustomForm | null {
    if (!hasNonEmptyString(obj.name)) return null;
    return normalizeCustomForm({
        ...(obj as unknown as CustomForm),
        id: ensureId(obj.id),
        name: obj.name,
        description: typeof obj.description === 'string' ? obj.description : ''
    });
}

function sanitizeCustomStatus(obj: Record<string, unknown>): CustomStatus | null {
    if (!hasNonEmptyString(obj.name)) return null;
    return {
        ...(obj as unknown as CustomStatus),
        id: ensureId(obj.id),
        name: obj.name,
        description: typeof obj.description === 'string' ? obj.description : '',
        effects: typeof obj.effects === 'string' ? obj.effects : '',
        color: hasNonEmptyString(obj.color) ? obj.color : '#888888',
        textColor: hasNonEmptyString(obj.textColor) ? obj.textColor : '#ffffff'
    };
}

function sanitizeCustomFieldEffect(obj: Record<string, unknown>): CustomFieldEffect | null {
    if (!hasNonEmptyString(obj.name)) return null;
    const category =
        obj.category === 'weather' || obj.category === 'terrain' || obj.category === 'field' ? obj.category : 'field';
    return {
        ...(obj as unknown as CustomFieldEffect),
        id: ensureId(obj.id),
        name: obj.name,
        category,
        defaultRounds: toFiniteNumber(obj.defaultRounds, 5),
        color: hasNonEmptyString(obj.color) ? obj.color : '#3B82F6',
        icon: typeof obj.icon === 'string' ? obj.icon : '',
        tags: typeof obj.tags === 'string' ? obj.tags : '',
        description: typeof obj.description === 'string' ? obj.description : '',
        triggerMoves: obj.triggerMoves !== undefined ? toStringArray(obj.triggerMoves) : undefined
    };
}

function createEmptyHomebrewData(): HomebrewStorageData {
    return {
        customTypes: [],
        customAbilities: [],
        customMoves: [],
        customPokemon: [],
        customItems: [],
        customForms: [],
        customStatuses: [],
        customFieldEffects: [],
        needsBackup: false,
        updatedAt: Date.now()
    };
}

export function sanitizeHomebrewData(raw: unknown): HomebrewStorageData {
    if (!isPlainObject(raw)) {
        return createEmptyHomebrewData();
    }
    return {
        customTypes: sanitizeArray(raw.customTypes, sanitizeCustomType),
        customAbilities: sanitizeArray(raw.customAbilities, sanitizeCustomAbility),
        customMoves: sanitizeArray(raw.customMoves, sanitizeCustomMove),
        customPokemon: sanitizeArray(raw.customPokemon, sanitizeCustomPokemon),
        customItems: sanitizeArray(raw.customItems, sanitizeCustomItem),
        customForms: sanitizeArray(raw.customForms, sanitizeCustomForm),
        customStatuses: sanitizeArray(raw.customStatuses, sanitizeCustomStatus),
        customFieldEffects: sanitizeArray(raw.customFieldEffects, sanitizeCustomFieldEffect),
        needsBackup: Boolean(raw.needsBackup),
        updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now()
    };
}

export function validateAndSanitizeHomebrewBackup(raw: unknown): HomebrewStorageData | null {
    if (!isPlainObject(raw)) return null;
    const hasAtLeastOneArray = HOMEBREW_ARRAY_KEYS.some((key) => Array.isArray(raw[key]));
    if (!hasAtLeastOneArray) return null;

    const totalRawCount = HOMEBREW_ARRAY_KEYS.reduce(
        (sum, key) => sum + (Array.isArray(raw[key]) ? (raw[key] as unknown[]).length : 0),
        0
    );
    const sanitized = sanitizeHomebrewData(raw);
    const totalSanitizedCount =
        sanitized.customTypes.length +
        sanitized.customAbilities.length +
        sanitized.customMoves.length +
        sanitized.customPokemon.length +
        sanitized.customItems.length +
        sanitized.customForms.length +
        sanitized.customStatuses.length +
        (sanitized.customFieldEffects?.length ?? 0);

    if (totalRawCount > 0 && totalSanitizedCount === 0) {
        return null;
    }

    return sanitized;
}

