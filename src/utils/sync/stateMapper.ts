import type {
    CharacterState,
    MoveData,
    SkillCheck,
    ExtraCategory,
    InventoryItem,
    PassiveItem,
    StatusItem,
    EffectItem,
    CustomInfo,
    Badge,
    TransformationType,
    Rank
} from '../../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { getKnownAbility } from '../../data/abilities/knownAbilities';
import { getItemArt } from '../graphics/itemArtCatalog';
import { KNOWN_ITEMS } from '../../data/constants';

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
        console.warn('[StateMapper] Failed to parse extra categories from metadata:', e);
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
        console.warn('[StateMapper] Failed to parse moves from metadata:', e);
        return [];
    }
}

function parseWishlist(meta: Record<string, unknown>): string[] {
    try {
        const raw = meta['moves-wishlist-data'] ?? meta['wishlist-data'] ?? meta['wishlist'];
        if (!raw) return [];
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
        return [];
    } catch (e) {
        console.warn('[StateMapper] Failed to parse wishlist from metadata:', e);
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
        console.warn('[StateMapper] Failed to parse skill checks from metadata:', e);
        return [];
    }
}

function parseInventory(meta: Record<string, unknown>): InventoryItem[] {
    try {
        const rawInv = meta['inv-data'] ? JSON.parse(String(meta['inv-data'])) : [];
        if (!Array.isArray(rawInv)) return [];

        return rawInv.map((i: Record<string, unknown>) => {
            const rawName = String(i.name || i.Name || '');
            let imageUrl = typeof i.imageUrl === 'string' ? i.imageUrl : undefined;
            if ((!imageUrl || imageUrl === 'none') && rawName) {
                const known = getItemArt(rawName);
                if (known) imageUrl = known;
            }
            const rawDesc = String(i.desc || i.Description || i.Effect || '');
            let tags = typeof i.tags === 'string' ? i.tags : '';
            let cleanDesc = rawDesc;

            // Legacy compatibility: If desc contains bracket tags [ ... ],
            // extract them into tags and clean up desc!
            const legacyMatches = Array.from(rawDesc.matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`);
            if (legacyMatches.length > 0) {
                const currentTagList = tags
                    ? Array.from(tags.matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`)
                    : [];
                tags = Array.from(new Set([...currentTagList, ...legacyMatches])).join(' ');
                cleanDesc = rawDesc
                    .replace(/\[.*?\]/g, '')
                    .replace(/\n\s*\n+/g, '\n')
                    .trim();
            }

            // Auto-tag known items if tags are empty!
            if (!tags && rawName) {
                const knownItemMatch = KNOWN_ITEMS.find((k) => k.name.toLowerCase() === rawName.toLowerCase());
                if (knownItemMatch?.tags) {
                    tags = knownItemMatch.tags;
                }
            }

            return {
                id: (i.id as string) || crypto.randomUUID(),
                qty: Number(i.qty !== undefined ? i.qty : 1),
                name: rawName,
                desc: cleanDesc,
                tags: tags || undefined,
                active: i.active === true || i.active === 'true',
                imageUrl,
                showInRollLog: i.showInRollLog !== false && i.showInRollLog !== 'false',
                boostLevel: typeof i.boostLevel === 'number' ? i.boostLevel : undefined
            };
        });
    } catch (e) {
        console.warn('[StateMapper] Failed to parse inventory from metadata:', e);
        return [];
    }
}

function parsePassives(meta: Record<string, unknown>): PassiveItem[] {
    try {
        const rawPassives = meta['passives-data'] ? JSON.parse(String(meta['passives-data'])) : [];
        if (!Array.isArray(rawPassives)) return [];

        return rawPassives.map((p: Record<string, unknown>) => ({
            id: (p.id as string) || crypto.randomUUID(),
            name: String(p.name || ''),
            desc: String(p.desc || p.description || p.effect || ''),
            active: p.active !== false && p.active !== 'false',
            showInConditions: p.showInConditions === true || p.showInConditions === 'true',
            showInRollLog: p.showInRollLog !== false && p.showInRollLog !== 'false',
            boostLevel: typeof p.boostLevel === 'number' ? p.boostLevel : undefined
        }));
    } catch (e) {
        console.warn('[StateMapper] Failed to parse passives from metadata:', e);
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
    } catch (e) {
        console.warn('[StateMapper] Failed to parse statuses from metadata:', e);
    }
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
        console.warn('[StateMapper] Failed to parse effects from metadata:', e);
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
        console.warn('[StateMapper] Failed to parse custom info from metadata:', e);
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
            emoji: String(b.emoji || '🏅'),
            imageUrl: b.imageUrl ? String(b.imageUrl) : undefined
        }));
    } catch (e) {
        console.warn('[StateMapper] Failed to parse badges from metadata:', e);
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
        console.warn('[StateMapper] Failed to parse banked accuracy dice from metadata:', e);
        parsedBankedAccDice = {};
    }

    let parsedBoostLevels: Record<string, number> = {};
    try {
        const boostStr = String(meta['boost-levels'] || '{}');
        parsedBoostLevels = JSON.parse(boostStr);
    } catch {
        parsedBoostLevels = {};
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
        bankedAccDice: parsedBankedAccDice,
        boostLevels: parsedBoostLevels
    };
}

function parseIdentity(meta: Record<string, unknown>, state: CharacterState, parsedBadges: Badge[]) {
    const abilityListStr = String(meta['ability-list'] || '');
    const loadedAbilities = abilityListStr ? abilityListStr.split(',') : [];

    const loadedRank = (meta['rank'] as Rank) || 'Starter';
    const loadedAbility = String(meta['ability'] || '');
    let loadedTags = String(meta['ability-tags'] || '');
    const cleanLoadedAbility = loadedAbility.replace(/\s*\(HA\)$/i, '').trim();
    if (cleanLoadedAbility) {
        const known = getKnownAbility(cleanLoadedAbility, loadedRank);
        const custom = state.roomCustomAbilities?.find(
            (ca) => ca.name.trim().toLowerCase() === cleanLoadedAbility.toLowerCase()
        );
        if (known) {
            loadedTags = known.tags;
            const rawMetaTags = String(meta['ability-tags'] || '').trim();
            if (rawMetaTags && rawMetaTags !== known.tags) {
                let cleanOldTags = rawMetaTags;
                if (cleanLoadedAbility.toLowerCase() === 'super luck') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*high crit(?:ical)?\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'compound eyes') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*acc\s*\+?1\s*:\s*low acc(?:uracy)?\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'mega launcher') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dmg\s*\+?1\s*:\s*projectile move\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'reckless') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dmg\s*\+?1\s*:\s*recoil\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'dragon maw') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dmg\s*\+?1\s*:\s*dragon\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'transistor') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dmg\s*\+?1\s*:\s*electric\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'solar power') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*spe\s*\+?1\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'sand rush') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dex\s*\+?2\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'slush rush') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dex\s*\+?2\s*\]/gi, '').trim();
                }
                const knownLower = known.tags.toLowerCase();
                const extra = cleanOldTags
                    .split(/\s+(?=\[)/)
                    .map((t) => t.trim())
                    .filter((t) => t && !knownLower.includes(t.toLowerCase()))
                    .join(' ');
                if (extra) loadedTags = `${loadedTags} ${extra}`.trim();
            }
        } else if (custom) {
            if (!loadedTags) {
                loadedTags = `${custom.effect || ''} ${custom.description || ''}`.trim();
            }
        } else if (!loadedTags) {
            // No tags
        } else {
            const isCustom = Boolean(custom);
            if (
                !isCustom &&
                (loadedTags.includes('[Str +1]') || loadedTags.includes('[Str +2]')) &&
                cleanLoadedAbility !== 'Huge Power' &&
                cleanLoadedAbility !== 'Pure Power'
            ) {
                loadedTags = '';
            }
        }
    }
    if (cleanLoadedAbility === 'Huge Power' || cleanLoadedAbility === 'Pure Power') {
        const cleanRank = String(loadedRank).toLowerCase().trim();
        const isHigh =
            cleanRank === 'expert' || cleanRank === 'ace' || cleanRank === 'master' || cleanRank === 'champion';
        if (!isHigh && loadedTags.includes('[Str +2]')) {
            loadedTags = loadedTags.replace(/\[Str \+2\]/g, '[Str +1]');
        } else if (isHigh && loadedTags.includes('[Str +1]')) {
            loadedTags = loadedTags.replace(/\[Str \+1\]/g, '[Str +2]');
        }
    }

    const loadedBoostActive = meta['ability-boost-active'] === true || meta['ability-boost-active'] === 'true';
    const rawBoostLevel = meta['ability-boost-level'];
    const loadedBoostLevel = rawBoostLevel !== undefined ? Number(rawBoostLevel) : loadedBoostActive ? 1 : 0;

    return {
        ...state.identity,
        entityId: String(meta['entityId'] || meta.entityId || state.identity.entityId || ''),
        nickname: String(meta['nickname'] || ''),
        species: String(meta['species'] || ''),
        nature: String(meta['nature'] || ''),
        rank: loadedRank,

        type1: String(meta['type1'] || meta['Type1'] || ''),
        type2: (() => {
            const raw = String(meta['type2'] || meta['Type2'] || '').trim();
            return raw.toLowerCase() === 'none' ? '' : raw;
        })(),

        ability: loadedAbility,
        abilityActive:
            meta['ability-active'] === undefined
                ? true
                : meta['ability-active'] === true || meta['ability-active'] === 'true',
        abilityBoostActive: loadedBoostActive,
        abilityBoostLevel: loadedBoostLevel,
        abilityTags: loadedTags,
        availableAbilities: loadedAbilities,
        previousNativeAbility: String(meta['previous-native-ability'] || ''),
        mode: String(meta['mode'] || 'Pokémon'),
        age: String(meta['age'] || ''),
        gender: String(meta['gender'] || ''),
        rolls: String(meta['rolls'] || 'Public (Everyone)'),
        combat: String(meta['combat'] || ''),
        social: String(meta['social'] || ''),
        hand: String(meta['hand'] || ''),
        isNPC: meta['is-npc'] === true || meta['is-npc'] === 'true',
        coreLocked: meta['core-locked'] !== undefined ? Boolean(meta['core-locked']) : true,
        socialLocked: meta['social-locked'] !== undefined ? Boolean(meta['social-locked']) : true,
        hpLocked: meta['hp-locked'] !== undefined ? Boolean(meta['hp-locked']) : true,
        willLocked: meta['will-locked'] !== undefined ? Boolean(meta['will-locked']) : true,
        pokemonBackup: String(meta['pokemon-backup'] || ''),
        trainerBackup: String(meta['trainer-backup'] || ''),

        tokenImageUrl: meta['token-image-url']
            ? String(meta['token-image-url'])
            : meta['tokenImageUrl']
              ? String(meta['tokenImageUrl'])
              : '',

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
        colorAct: String(meta['color-act'] || '#4890fc'),
        colorEva: String(meta['color-eva'] || '#c387fc'),
        colorCla: String(meta['color-cla'] || '#dfad43'),

        trackerScale: meta['tracker-scale'] !== undefined ? Number(meta['tracker-scale']) : 100,
        trackerLayer: (meta['tracker-layer'] as 'POPOVER' | 'ATTACHMENT' | 'CHARACTER' | 'MOUNT') || 'ATTACHMENT',
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

        // --- Hydrate overrides ---
        themePrimaryOverride: String(meta['theme-primary-override'] || ''),
        themeSecondaryOverride: String(meta['theme-secondary-override'] || ''),

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
    const parsedWishlist = parseWishlist(meta);
    const parsedChecks = parseSkillChecks(meta, parsedExtraCats);
    const parsedInv = parseInventory(meta);
    const parsedPassives = parsePassives(meta);
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
        identity: {
            ...state.identity,
            ...newIdentity
        },
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
        wishlist: parsedWishlist,
        skillChecks: parsedChecks,
        extraCategories: parsedExtraCats,
        inventory: parsedInv,
        passives: parsedPassives,
        statuses: parsedStatuses,
        effects: parsedEffects,
        customInfo: parsedCustomInfo
    };
}

// =========================================
// ZUSTAND -> OBR METADATA FLATTENING
// =========================================
export { flattenStateToMetadata } from './flattenStateToMetadata';
