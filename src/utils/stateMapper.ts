import type {
    CharacterState,
    MoveData,
    SkillCheck,
    ExtraCategory,
    InventoryItem,
    StatusItem,
    EffectItem,
    CustomInfo,
    Badge,
    TransformationType,
    Rank
} from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';

// =========================================
// OBR METADATA -> ZUSTAND HYDRATION PARSERS
// =========================================

const mapAttr = (val: string): string => {
    const v = (val || '').toLowerCase().trim();
    if (v.includes('str')) return 'str';
    if (v.includes('dex')) return 'dex';
    if (v.includes('vit')) return 'vit';
    if (v.includes('spe')) return 'spe';
    if (v.includes('ins')) return 'ins';
    if (v.includes('will')) return 'will';
    if (v.includes('tou')) return 'tou';
    if (v.includes('coo')) return 'coo';
    if (v.includes('bea')) return 'bea';
    if (v.includes('cut')) return 'cut';
    if (v.includes('cle')) return 'cle';
    return '';
};

const mapSkill = (val: string, parsedExtraCats: ExtraCategory[]): string => {
    const v = (val || '').split('/')[0].toLowerCase().trim();
    const officialSkills = Object.values(Skill).map((s) => s.toLowerCase());

    for (const s of officialSkills) {
        if (v.includes(s)) return s;
    }

    for (const cat of parsedExtraCats) {
        for (const sk of cat.skills) {
            if (v === sk.id.toLowerCase() || (sk.name && v === sk.name.toLowerCase())) return sk.id;
        }
    }
    return 'none';
};

function parseStats(meta: Record<string, unknown>, state: CharacterState) {
    const newStats = { ...state.stats };
    Object.values(CombatStat).forEach((stat) => {
        newStats[stat] = { ...newStats[stat] };
        newStats[stat].base =
            meta[`${stat}-base`] !== undefined ? Number(meta[`${stat}-base`]) : stat === 'ins' ? 1 : 2;
        newStats[stat].rank = meta[`${stat}-rank`] !== undefined ? Number(meta[`${stat}-rank`]) : 0;
        newStats[stat].buff = meta[`${stat}-buff`] !== undefined ? Number(meta[`${stat}-buff`]) : 0;
        newStats[stat].debuff = meta[`${stat}-debuff`] !== undefined ? Number(meta[`${stat}-debuff`]) : 0;

        const limitVal = meta[`${stat}-limit`] ?? meta[`${stat}-max`];
        newStats[stat].limit = limitVal !== undefined ? Number(limitVal) : 5;
    });
    return newStats;
}

function parseSocials(meta: Record<string, unknown>, state: CharacterState) {
    const newSocials = { ...state.socials };
    Object.values(SocialStat).forEach((stat) => {
        newSocials[stat] = { ...newSocials[stat] };
        newSocials[stat].base = meta[`${stat}-base`] !== undefined ? Number(meta[`${stat}-base`]) : 1;
        newSocials[stat].rank = meta[`${stat}-rank`] !== undefined ? Number(meta[`${stat}-rank`]) : 0;
        newSocials[stat].buff = meta[`${stat}-buff`] !== undefined ? Number(meta[`${stat}-buff`]) : 0;
        newSocials[stat].debuff = meta[`${stat}-debuff`] !== undefined ? Number(meta[`${stat}-debuff`]) : 0;

        const limitVal = meta[`${stat}-limit`] ?? meta[`${stat}-max`];
        newSocials[stat].limit = limitVal !== undefined ? Number(limitVal) : 5;
    });
    return newSocials;
}

function parseSkills(meta: Record<string, unknown>, state: CharacterState) {
    const newSkills = { ...state.skills };
    Object.values(Skill).forEach((skill) => {
        newSkills[skill] = { ...newSkills[skill] };
        newSkills[skill].base = meta[`${skill}-base`] !== undefined ? Number(meta[`${skill}-base`]) : 0;
        newSkills[skill].buff = meta[`${skill}-buff`] !== undefined ? Number(meta[`${skill}-buff`]) : 0;
        newSkills[skill].customName = meta[`label-${skill}`] !== undefined ? String(meta[`label-${skill}`]) : '';
    });
    return newSkills;
}

function parseExtraCategories(meta: Record<string, unknown>): ExtraCategory[] {
    try {
        const data = meta['extra-skills-data'];
        return data ? JSON.parse(String(data)) : [];
    } catch (e) {
        return [];
    }
}

function parseMoves(meta: Record<string, unknown>, parsedExtraCats: ExtraCategory[]): MoveData[] {
    try {
        const rawMoves = meta['moves-data'] ? JSON.parse(String(meta['moves-data'])) : [];
        if (!Array.isArray(rawMoves)) return [];

        return rawMoves.map((m: Record<string, unknown>) => {
            const rawCat = String(m.category || m.Category || 'Physical');
            const cat = rawCat.startsWith('Phys') ? 'Physical' : rawCat.startsWith('Spec') ? 'Special' : 'Status';

            return {
                id: (m.id as string) || crypto.randomUUID(),
                active: m.active === true || m.active === 'true',
                name: String(m.name || m.Name || ''),
                type: String(m.type || m.Type || 'Normal'),
                category: cat as 'Physical' | 'Special' | 'Status',
                acc1: mapAttr(String(m.acc1 || m.Accuracy1 || 'str')) || 'str',
                acc2: mapSkill(String(m.acc2 || m.Accuracy2 || 'none'), parsedExtraCats),
                dmg1: mapAttr(String(m.dmg1 || m.Damage1 || '')),
                power: Number(m.power !== undefined ? m.power : m.Power || 0),
                desc: String(m.desc || m.Description || m.Effect || ''),
                marker: String(m.marker || m.Marker || '')
            };
        });
    } catch (e) {
        return [];
    }
}

function parseSkillChecks(meta: Record<string, unknown>, parsedExtraCats: ExtraCategory[]): SkillCheck[] {
    try {
        const rawChecks = meta['skill-checks-data'] ? JSON.parse(String(meta['skill-checks-data'])) : [];
        if (!Array.isArray(rawChecks)) return [];

        return rawChecks.map((c: Record<string, unknown>) => ({
            id: (c.id as string) || crypto.randomUUID(),
            name: String(c.name || c.Name || ''),
            attr: mapAttr(String(c.attr || c.Attribute || 'ins')) || 'ins',
            skill: mapSkill(String(c.skill || c.Skill || 'none'), parsedExtraCats)
        }));
    } catch (e) {
        return [];
    }
}

function parseInventory(meta: Record<string, unknown>): InventoryItem[] {
    try {
        const rawInv = meta['inv-data'] ? JSON.parse(String(meta['inv-data'])) : [];
        if (!Array.isArray(rawInv)) return [];

        return rawInv.map((i: Record<string, unknown>) => ({
            id: (i.id as string) || crypto.randomUUID(),
            qty: Number(i.qty !== undefined ? i.qty : 1),
            name: String(i.name || i.Name || ''),
            desc: String(i.desc || i.Description || i.Effect || ''),
            active: i.active === true || i.active === 'true'
        }));
    } catch (e) {
        return [];
    }
}

function parseStatuses(meta: Record<string, unknown>): StatusItem[] {
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
    } catch (e) {}
    return [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }];
}

function parseEffects(meta: Record<string, unknown>): EffectItem[] {
    try {
        const rawEffects = meta['effects-data'] ? JSON.parse(String(meta['effects-data'])) : [];
        if (!Array.isArray(rawEffects)) return [];

        return rawEffects.map((e: Record<string, unknown>) => ({
            id: (e.id as string) || crypto.randomUUID(),
            name: String(e.name || e.Name || ''),
            rounds: Number(e.rounds || 0)
        }));
    } catch (e) {
        return [];
    }
}

function parseCustomInfo(meta: Record<string, unknown>): CustomInfo[] {
    try {
        const rawCustomInfo = meta['custom-info-data'] ? JSON.parse(String(meta['custom-info-data'])) : [];
        if (!Array.isArray(rawCustomInfo)) return [];

        return rawCustomInfo.map((c: Record<string, unknown>) => ({
            id: (c.id as string) || crypto.randomUUID(),
            label: String(c.label || c.Label || ''),
            value: String(c.value || c.Value || '')
        }));
    } catch (e) {
        return [];
    }
}

function parseBadges(meta: Record<string, unknown>): Badge[] {
    try {
        const rawBadges = meta['badges-data'] ? JSON.parse(String(meta['badges-data'])) : [];
        if (!Array.isArray(rawBadges)) return [];

        return rawBadges.map((b: Record<string, unknown>) => ({
            id: String(b.id || crypto.randomUUID()),
            name: String(b.name || ''),
            emoji: String(b.emoji || '🏅')
        }));
    } catch (e) {
        return [];
    }
}

function parseHealth(meta: Record<string, unknown>) {
    return {
        hpCurr: meta['hp-curr'] !== undefined ? Number(meta['hp-curr']) : 5,
        hpMax: meta['hp-max-display'] !== undefined ? Number(meta['hp-max-display']) : 5,
        hpBase: meta['hp-base'] !== undefined ? Number(meta['hp-base']) : 4,
        temporaryHitPoints: meta['temporary-hit-points'] !== undefined ? Number(meta['temporary-hit-points']) : 0,
        temporaryHitPointsMax:
            meta['temporary-hit-points-max'] !== undefined ? Number(meta['temporary-hit-points-max']) : 0
    };
}

function parseWill(meta: Record<string, unknown>) {
    return {
        willCurr: meta['will-curr'] !== undefined ? Number(meta['will-curr']) : 4,
        willMax: meta['will-max-display'] !== undefined ? Number(meta['will-max-display']) : 4,
        willBase: meta['will-base'] !== undefined ? Number(meta['will-base']) : 3,
        temporaryWill: meta['temporary-will'] !== undefined ? Number(meta['temporary-will']) : 0,
        temporaryWillMax: meta['temporary-will-max'] !== undefined ? Number(meta['temporary-will-max']) : 0
    };
}

function parseDerived(meta: Record<string, unknown>) {
    return {
        defBuff: Number(meta['def-buff'] ?? meta['defBuff']) || 0,
        defDebuff: Number(meta['def-debuff'] ?? meta['defDebuff']) || 0,
        sdefBuff: Number(meta['spd-buff'] ?? meta['sdefBuff']) || 0,
        sdefDebuff: Number(meta['spd-debuff'] ?? meta['sdefDebuff']) || 0,
        happy: Number(meta['happiness-curr'] ?? meta['happy']) || 0,
        loyal: Number(meta['loyalty-curr'] ?? meta['loyal']) || 0
    };
}

function parseExtras(meta: Record<string, unknown>) {
    return {
        core: Number(meta['extra-core']) || 0,
        social: Number(meta['extra-social']) || 0,
        skill: Number(meta['extra-skill']) || 0
    };
}

function parseTrackers(meta: Record<string, unknown>) {
    let parsedBankedAccDice: Record<string, number> = {};
    try {
        const bankedStr = String(meta['banked-acc-dice'] || '{}');
        parsedBankedAccDice = JSON.parse(bankedStr);
    } catch (e) {
        parsedBankedAccDice = {};
    }

    return {
        actions: Number(meta['actions-used']) || 0,
        evade: meta['evasions-used'] === true || meta['evasions-used'] === 'true',
        clash: meta['clashes-used'] === true || meta['clashes-used'] === 'true',
        chances: Number(meta['chances-used']) || 0,
        fate: Number(meta['fate-used']) || 0,
        globalAcc: Number(meta['global-acc-mod']) || 0,
        globalDmg: Number(meta['global-dmg-mod']) || 0,
        globalSucc: Number(meta['global-succ-mod']) || 0,
        globalChance: Number(meta['global-chance-mod']) || 0,
        ignoredPain: Number(meta['ignored-pain-mod']) || 0,
        firstHitAcc: meta['first-hit-acc-active'] === true || meta['first-hit-acc-active'] === 'true',
        firstHitDmg: meta['first-hit-dmg-active'] === true || meta['first-hit-dmg-active'] === 'true',
        bankedAccDice: parsedBankedAccDice
    };
}

function parseIdentity(meta: Record<string, unknown>, state: CharacterState, parsedBadges: Badge[]) {
    const abilityListStr = String(meta['ability-list'] || '');
    const loadedAbilities = abilityListStr ? abilityListStr.split(',') : [];

    return {
        ...state.identity,
        nickname: String(meta['nickname'] || ''),
        species: String(meta['species'] || ''),
        nature: String(meta['nature'] || ''),
        rank: (meta['rank'] as Rank) || 'Starter',

        type1: String(meta['type1'] || meta['Type1'] || ''),
        type2: String(meta['type2'] || meta['Type2'] || ''),

        ability: String(meta['ability'] || ''),
        availableAbilities: loadedAbilities,
        mode: String(meta['mode'] || 'Pokémon'),
        age: String(meta['age'] || ''),
        gender: String(meta['gender'] || ''),
        rolls: String(meta['rolls'] || 'Public (Everyone)'),
        combat: String(meta['combat'] || ''),
        social: String(meta['social'] || ''),
        hand: String(meta['hand'] || ''),
        isNPC: meta['is-npc'] === true || meta['is-npc'] === 'true',
        pokemonBackup: String(meta['pokemon-backup'] || ''),
        trainerBackup: String(meta['trainer-backup'] || ''),

        activeTransformation: (meta['active-transformation'] as TransformationType) || 'None',
        activeFormId: String(meta['active-form-id'] || ''),
        formSaves: meta['form-saves'] ? JSON.parse(String(meta['form-saves'])) : {},
        customFormConfig: meta['custom-form-config'] ? JSON.parse(String(meta['custom-form-config'])) : {},
        customFormImages: meta['custom-form-images'] ? JSON.parse(String(meta['custom-form-images'])) : {},

        baseFormData: String(meta['base-form-data'] || ''),
        altFormData: String(meta['alt-form-data'] || ''),
        maxFormData: String(meta['max-form-data'] || ''),
        terastallizeAffinity: String(meta['terastallize-affinity'] || ''),
        terastallizeBonusActive:
            meta['terastallize-bonus-active'] === true || meta['terastallize-bonus-active'] === 'true',

        megaImageUrl: String(meta['mega-image-url'] || ''),
        maxImageUrl: String(meta['max-image-url'] || ''),
        teraImageUrl: String(meta['tera-image-url'] || ''),

        customFormFirstHitAccActive:
            meta['custom-form-first-hit-acc'] === true || meta['custom-form-first-hit-acc'] === 'true',
        customFormFirstHitDmgActive:
            meta['custom-form-first-hit-dmg'] === true || meta['custom-form-first-hit-dmg'] === 'true',

        badges: parsedBadges,

        showTrackers: meta['show-trackers'] !== false && meta['show-trackers'] !== 'false',
        settingHpBar: meta['setting-hp-bar'] !== false && meta['setting-hp-bar'] !== 'false',
        gmHpBar: meta['gm-hp-bar'] === true || meta['gm-hp-bar'] === 'true',
        settingHpText: meta['setting-hp-text'] !== false && meta['setting-hp-text'] !== 'false',
        gmHpText: meta['gm-hp-text'] === true || meta['gm-hp-text'] === 'true',
        settingWillBar: meta['setting-will-bar'] !== false && meta['setting-will-bar'] !== 'false',
        gmWillBar: meta['gm-will-bar'] === true || meta['gm-will-bar'] === 'true',
        settingWillText: meta['setting-will-text'] !== false && meta['setting-will-text'] !== 'false',
        gmWillText: meta['gm-will-text'] === true || meta['gm-will-text'] === 'true',
        settingDefBadge: meta['setting-def-badge'] !== false && meta['setting-def-badge'] !== 'false',
        gmDefBadge: meta['gm-def-badge'] === true || meta['gm-def-badge'] === 'true',
        settingEcoBadge: meta['setting-eco-badge'] !== false && meta['setting-eco-badge'] !== 'false',
        gmEcoBadge: meta['gm-eco-badge'] === true || meta['gm-eco-badge'] === 'true',
        gmOnlyLootGen: meta['gm-only-loot-gen'] !== false && meta['gm-only-loot-gen'] !== 'false',
        colorAct: String(meta['color-act'] || '#4890fc'),
        colorEva: String(meta['color-eva'] || '#c387fc'),
        colorCla: String(meta['color-cla'] || '#dfad43'),

        trackerScale: meta['tracker-scale'] !== undefined ? Number(meta['tracker-scale']) : 100,
        xOffset: Number(meta['x-offset']) || 0,
        yOffset: Number(meta['y-offset']) || 0,
        hpOffsetX: Number(meta['hp-offset-x']) || 0,
        hpOffsetY: Number(meta['hp-offset-y']) || 0,
        willOffsetX: Number(meta['will-offset-x']) || 0,
        willOffsetY: Number(meta['will-offset-y']) || 0,
        defOffsetX: Number(meta['def-offset-x']) || 0,
        defOffsetY: Number(meta['def-offset-y']) || 0,
        actOffsetX: Number(meta['act-offset-x']) || 0,
        actOffsetY: Number(meta['act-offset-y']) || 0,
        evaOffsetX: Number(meta['eva-offset-x']) || 0,
        evaOffsetY: Number(meta['eva-offset-y']) || 0,
        claOffsetX: Number(meta['cla-offset-x']) || 0,
        claOffsetY: Number(meta['cla-offset-y']) || 0,

        dexId: String(meta['dex-id'] || ''),
        dexCategory: String(meta['dex-category'] || ''),
        height: String(meta['height'] || ''),
        weight: String(meta['weight'] || ''),
        dexDescription: String(meta['dex-description'] || '')
    };
}

export function hydrateStateFromMetadata(
    meta: Record<string, unknown>,
    state: CharacterState
): Partial<CharacterState> {
    const parsedExtraCats = parseExtraCategories(meta);
    const parsedMoves = parseMoves(meta, parsedExtraCats);
    const parsedChecks = parseSkillChecks(meta, parsedExtraCats);
    const parsedInv = parseInventory(meta);
    const parsedStatuses = parseStatuses(meta);
    const parsedEffects = parseEffects(meta);
    const parsedCustomInfo = parseCustomInfo(meta);
    const parsedBadges = parseBadges(meta);

    const newStats = parseStats(meta, state);
    const newSocials = parseSocials(meta, state);
    const newSkills = parseSkills(meta, state);
    const newHealth = parseHealth(meta);
    const newWill = parseWill(meta);
    const newIdentity = parseIdentity(meta, state, parsedBadges);
    const newDerived = parseDerived(meta);
    const newExtras = parseExtras(meta);
    const newTrackers = parseTrackers(meta);

    return {
        identity: newIdentity,
        health: newHealth,
        will: newWill,
        derived: newDerived,
        extras: newExtras,
        trackers: newTrackers,
        notes: String(meta['notes'] || ''),
        tp: Number(meta['training-points']) || 0,
        currency: Number(meta['currency']) || 0,
        stats: newStats,
        socials: newSocials,
        skills: newSkills,
        moves: parsedMoves,
        skillChecks: parsedChecks,
        extraCategories: parsedExtraCats,
        inventory: parsedInv,
        statuses: parsedStatuses,
        effects: parsedEffects,
        customInfo: parsedCustomInfo
    };
}

// =========================================
// ZUSTAND -> OBR METADATA FLATTENING
// =========================================

export function flattenStateToMetadata(state: CharacterState): Record<string, string | number | boolean> {
    const flatMetadata: Record<string, string | number | boolean> = {};

    try {
        const sanitizeBackup = (backupString: string | undefined, key: string) => {
            if (!backupString) return;
            try {
                const parsed = JSON.parse(backupString);
                if (parsed.identity || parsed.health || parsed.backupFormData) {
                    console.warn(`Blocked bloated legacy data for ${key} during import to protect token.`);
                } else {
                    flatMetadata[key] = backupString;
                }
            } catch (e) {
                flatMetadata[key] = backupString;
            }
        };

        if (state.identity) {
            if (state.identity.nickname !== undefined) flatMetadata['name'] = state.identity.nickname;
            if (state.identity.species !== undefined) flatMetadata['species'] = state.identity.species;
            if (state.identity.nature !== undefined) flatMetadata['nature'] = state.identity.nature;
            if (state.identity.ability !== undefined) flatMetadata['ability'] = state.identity.ability;
            if (state.identity.type1 !== undefined) flatMetadata['type1'] = state.identity.type1;
            if (state.identity.type2 !== undefined) flatMetadata['type2'] = state.identity.type2;
            if (state.identity.mode !== undefined) flatMetadata['mode'] = state.identity.mode;

            if (state.identity.activeTransformation !== undefined)
                flatMetadata['active-transformation'] = state.identity.activeTransformation;
            if (state.identity.activeFormId !== undefined) flatMetadata['active-form-id'] = state.identity.activeFormId;
            if (state.identity.formSaves !== undefined)
                flatMetadata['form-saves'] = JSON.stringify(state.identity.formSaves);
            if (state.identity.customFormConfig !== undefined)
                flatMetadata['custom-form-config'] = JSON.stringify(state.identity.customFormConfig);
            if (state.identity.customFormImages !== undefined)
                flatMetadata['custom-form-images'] = JSON.stringify(state.identity.customFormImages);
            if (state.identity.badges !== undefined)
                flatMetadata['badges-data'] = JSON.stringify(state.identity.badges);

            if (state.identity.terastallizeAffinity !== undefined)
                flatMetadata['terastallize-affinity'] = state.identity.terastallizeAffinity;
            if (state.identity.terastallizeBonusActive !== undefined)
                flatMetadata['terastallize-bonus-active'] = state.identity.terastallizeBonusActive;

            if (state.identity.megaImageUrl !== undefined) flatMetadata['mega-image-url'] = state.identity.megaImageUrl;
            if (state.identity.maxImageUrl !== undefined) flatMetadata['max-image-url'] = state.identity.maxImageUrl;
            if (state.identity.teraImageUrl !== undefined) flatMetadata['tera-image-url'] = state.identity.teraImageUrl;

            if (state.identity.customFormFirstHitAccActive !== undefined)
                flatMetadata['custom-form-first-hit-acc'] = state.identity.customFormFirstHitAccActive;
            if (state.identity.customFormFirstHitDmgActive !== undefined)
                flatMetadata['custom-form-first-hit-dmg'] = state.identity.customFormFirstHitDmgActive;

            if (state.identity.dexId !== undefined) flatMetadata['dex-id'] = state.identity.dexId;
            if (state.identity.dexCategory !== undefined) flatMetadata['dex-category'] = state.identity.dexCategory;
            if (state.identity.height !== undefined) flatMetadata['height'] = state.identity.height;
            if (state.identity.weight !== undefined) flatMetadata['weight'] = state.identity.weight;
            if (state.identity.dexDescription !== undefined)
                flatMetadata['dex-description'] = state.identity.dexDescription;

            sanitizeBackup(state.identity.baseFormData, 'base-form-data');
            sanitizeBackup(state.identity.altFormData, 'alt-form-data');
            sanitizeBackup(state.identity.maxFormData, 'max-form-data');
            sanitizeBackup(state.identity.pokemonBackup, 'pokemon-backup');
            sanitizeBackup(state.identity.trainerBackup, 'trainer-backup');
        }

        if (state.health) {
            if (state.health.hpCurr !== undefined) flatMetadata['hp-curr'] = state.health.hpCurr;
            if (state.health.hpMax !== undefined) flatMetadata['hp-max-display'] = state.health.hpMax;
            if (state.health.hpBase !== undefined) flatMetadata['hp-base'] = state.health.hpBase;
            if (state.health.temporaryHitPoints !== undefined)
                flatMetadata['temporary-hit-points'] = state.health.temporaryHitPoints;
            if (state.health.temporaryHitPointsMax !== undefined)
                flatMetadata['temporary-hit-points-max'] = state.health.temporaryHitPointsMax;
        }

        if (state.will) {
            if (state.will.willCurr !== undefined) flatMetadata['will-curr'] = state.will.willCurr;
            if (state.will.willMax !== undefined) flatMetadata['will-max-display'] = state.will.willMax;
            if (state.will.willBase !== undefined) flatMetadata['will-base'] = state.will.willBase;
            if (state.will.temporaryWill !== undefined) flatMetadata['temporary-will'] = state.will.temporaryWill;
            if (state.will.temporaryWillMax !== undefined)
                flatMetadata['temporary-will-max'] = state.will.temporaryWillMax;
        }

        if (state.tp !== undefined) flatMetadata['training-points'] = state.tp;
        if (state.currency !== undefined) flatMetadata['currency'] = state.currency;

        if (state.trackers) {
            if (state.trackers.firstHitAcc !== undefined)
                flatMetadata['first-hit-acc-active'] = state.trackers.firstHitAcc;
            if (state.trackers.firstHitDmg !== undefined)
                flatMetadata['first-hit-dmg-active'] = state.trackers.firstHitDmg;
            if (state.trackers.bankedAccDice !== undefined)
                flatMetadata['banked-acc-dice'] = JSON.stringify(state.trackers.bankedAccDice);
        }

        if (state.moves) flatMetadata['moves-data'] = JSON.stringify(state.moves);
        if (state.inventory) flatMetadata['inv-data'] = JSON.stringify(state.inventory);
        if (state.skillChecks) flatMetadata['skill-checks-data'] = JSON.stringify(state.skillChecks);
        if (state.extraCategories) flatMetadata['extra-skills-data'] = JSON.stringify(state.extraCategories);
        if (state.statuses) flatMetadata['status-list'] = JSON.stringify(state.statuses);
        if (state.effects) flatMetadata['effects-data'] = JSON.stringify(state.effects);
        if (state.customInfo) flatMetadata['custom-info-data'] = JSON.stringify(state.customInfo);

        if (state.stats) {
            Object.entries(state.stats).forEach(([stat, vals]) => {
                flatMetadata[`${stat}-base`] = vals.base;
                flatMetadata[`${stat}-rank`] = vals.rank;
                flatMetadata[`${stat}-buff`] = vals.buff;
                flatMetadata[`${stat}-debuff`] = vals.debuff;
                flatMetadata[`${stat}-limit`] = vals.limit;
            });
        }

        if (state.socials) {
            Object.entries(state.socials).forEach(([stat, vals]) => {
                flatMetadata[`${stat}-base`] = vals.base;
                flatMetadata[`${stat}-rank`] = vals.rank;
                flatMetadata[`${stat}-buff`] = vals.buff;
                flatMetadata[`${stat}-debuff`] = vals.debuff;
                flatMetadata[`${stat}-limit`] = vals.limit;
            });
        }

        if (state.skills) {
            Object.entries(state.skills).forEach(([skill, vals]) => {
                flatMetadata[`${skill}-base`] = vals.base;
                flatMetadata[`${skill}-buff`] = vals.buff;
                if (vals.customName) flatMetadata[`label-${skill}`] = vals.customName;
            });
        }
    } catch (error) {
        console.error('Error mapping Zustand state to OBR Metadata:', error);
    }

    return flatMetadata;
}
