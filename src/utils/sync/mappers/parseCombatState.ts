import type { CharacterState } from '@/store/storeTypes';
import { CombatStat, SocialStat, Skill } from '@/types/enums';
import { parseFiniteNumber } from './mapperHelpers';

export function parseStats(meta: Record<string, unknown>, state: CharacterState) {
    const isTrainer =
        meta.mode === 'Trainer' ||
        meta.mode === 'Trainer (Special)' ||
        meta.rank === 'Trainer' ||
        state.identity.mode === 'Trainer' ||
        (state.identity.rank as string) === 'Trainer';

    const newStats = { ...state.stats };
    Object.values(CombatStat).forEach((stat) => {
        newStats[stat] = { ...newStats[stat] };
        newStats[stat].base = parseFiniteNumber(meta[`${stat}-base`], isTrainer ? 1 : stat === 'ins' ? 1 : 2);
        newStats[stat].rank = parseFiniteNumber(meta[`${stat}-rank`], 0);
        newStats[stat].buff = parseFiniteNumber(meta[`${stat}-buff`], 0);
        newStats[stat].debuff = parseFiniteNumber(meta[`${stat}-debuff`], 0);

        const limitVal = meta[`${stat}-limit`] ?? meta[`${stat}-max`];
        newStats[stat].limit = parseFiniteNumber(limitVal, 5);
    });
    return newStats;
}

export function parseSocials(meta: Record<string, unknown>, state: CharacterState) {
    const newSocials = { ...state.socials };
    Object.values(SocialStat).forEach((stat) => {
        newSocials[stat] = { ...newSocials[stat] };
        newSocials[stat].base = parseFiniteNumber(meta[`${stat}-base`], 1);
        newSocials[stat].rank = parseFiniteNumber(meta[`${stat}-rank`], 0);
        newSocials[stat].buff = parseFiniteNumber(meta[`${stat}-buff`], 0);
        newSocials[stat].debuff = parseFiniteNumber(meta[`${stat}-debuff`], 0);

        const limitVal = meta[`${stat}-limit`] ?? meta[`${stat}-max`];
        newSocials[stat].limit = parseFiniteNumber(limitVal, 5);
    });
    return newSocials;
}

export function parseSkills(meta: Record<string, unknown>, state: CharacterState) {
    const newSkills = { ...state.skills };
    Object.values(Skill).forEach((skill) => {
        newSkills[skill] = { ...newSkills[skill] };
        newSkills[skill].base = parseFiniteNumber(meta[`${skill}-base`], 0);
        newSkills[skill].buff = parseFiniteNumber(meta[`${skill}-buff`], 0);
        newSkills[skill].customName = meta[`label-${skill}`] !== undefined ? String(meta[`label-${skill}`]) : '';
    });
    return newSkills;
}

export function parseHealth(meta: Record<string, unknown>) {
    const rawMax = meta['hp-max-display'] ?? meta['hp-max'];
    return {
        hpCurr: parseFiniteNumber(meta['hp-curr'], 5),
        hpMax: parseFiniteNumber(rawMax, 5),
        hpBase: parseFiniteNumber(meta['hp-base'], 4),
        temporaryHitPoints: parseFiniteNumber(meta['temporary-hit-points'], 0),
        temporaryHitPointsMax: parseFiniteNumber(meta['temporary-hit-points-max'], 0)
    };
}

export function parseWill(meta: Record<string, unknown>) {
    const rawMax = meta['will-max-display'] ?? meta['will-max'];
    return {
        willCurr: parseFiniteNumber(meta['will-curr'], 4),
        willMax: parseFiniteNumber(rawMax, 4),
        willBase: parseFiniteNumber(meta['will-base'], 3),
        temporaryWill: parseFiniteNumber(meta['temporary-will'], 0),
        temporaryWillMax: parseFiniteNumber(meta['temporary-will-max'], 0)
    };
}

export function parseDerived(meta: Record<string, unknown>) {
    return {
        defBuff: parseFiniteNumber(meta['def-buff'] ?? meta['defBuff'], 0),
        defDebuff: parseFiniteNumber(meta['def-debuff'] ?? meta['defDebuff'], 0),
        sdefBuff: parseFiniteNumber(meta['spd-buff'] ?? meta['sdefBuff'], 0),
        sdefDebuff: parseFiniteNumber(meta['spd-debuff'] ?? meta['sdefDebuff'], 0),
        happy: parseFiniteNumber(meta['happiness-curr'] ?? meta['happy'], 0),
        loyal: parseFiniteNumber(meta['loyalty-curr'] ?? meta['loyal'], 0)
    };
}

export function parseExtras(meta: Record<string, unknown>) {
    return {
        core: parseFiniteNumber(meta['extra-core'], 0),
        social: parseFiniteNumber(meta['extra-social'], 0),
        skill: parseFiniteNumber(meta['extra-skill'], 0)
    };
}

