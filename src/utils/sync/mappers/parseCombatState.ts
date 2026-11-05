import type { CharacterState } from '@/store/storeTypes';
import { CombatStat, SocialStat, Skill } from '@/types/enums';

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
        newStats[stat].base =
            meta[`${stat}-base`] !== undefined ? Number(meta[`${stat}-base`]) : isTrainer ? 1 : stat === 'ins' ? 1 : 2;
        newStats[stat].rank = meta[`${stat}-rank`] !== undefined ? Number(meta[`${stat}-rank`]) : 0;
        newStats[stat].buff = meta[`${stat}-buff`] !== undefined ? Number(meta[`${stat}-buff`]) : 0;
        newStats[stat].debuff = meta[`${stat}-debuff`] !== undefined ? Number(meta[`${stat}-debuff`]) : 0;

        const limitVal = meta[`${stat}-limit`] ?? meta[`${stat}-max`];
        newStats[stat].limit = limitVal !== undefined ? Number(limitVal) : 5;
    });
    return newStats;
}

export function parseSocials(meta: Record<string, unknown>, state: CharacterState) {
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

export function parseSkills(meta: Record<string, unknown>, state: CharacterState) {
    const newSkills = { ...state.skills };
    Object.values(Skill).forEach((skill) => {
        newSkills[skill] = { ...newSkills[skill] };
        newSkills[skill].base = meta[`${skill}-base`] !== undefined ? Number(meta[`${skill}-base`]) : 0;
        newSkills[skill].buff = meta[`${skill}-buff`] !== undefined ? Number(meta[`${skill}-buff`]) : 0;
        newSkills[skill].customName = meta[`label-${skill}`] !== undefined ? String(meta[`label-${skill}`]) : '';
    });
    return newSkills;
}

export function parseHealth(meta: Record<string, unknown>) {
    const rawMax = meta['hp-max-display'] ?? meta['hp-max'];
    return {
        hpCurr: meta['hp-curr'] !== undefined ? Number(meta['hp-curr']) : 5,
        hpMax: rawMax !== undefined ? Number(rawMax) : 5,
        hpBase: meta['hp-base'] !== undefined ? Number(meta['hp-base']) : 4,
        temporaryHitPoints: meta['temporary-hit-points'] !== undefined ? Number(meta['temporary-hit-points']) : 0,
        temporaryHitPointsMax:
            meta['temporary-hit-points-max'] !== undefined ? Number(meta['temporary-hit-points-max']) : 0
    };
}

export function parseWill(meta: Record<string, unknown>) {
    const rawMax = meta['will-max-display'] ?? meta['will-max'];
    return {
        willCurr: meta['will-curr'] !== undefined ? Number(meta['will-curr']) : 4,
        willMax: rawMax !== undefined ? Number(rawMax) : 4,
        willBase: meta['will-base'] !== undefined ? Number(meta['will-base']) : 3,
        temporaryWill: meta['temporary-will'] !== undefined ? Number(meta['temporary-will']) : 0,
        temporaryWillMax: meta['temporary-will-max'] !== undefined ? Number(meta['temporary-will-max']) : 0
    };
}

export function parseDerived(meta: Record<string, unknown>) {
    return {
        defBuff: Number(meta['def-buff'] ?? meta['defBuff']) || 0,
        defDebuff: Number(meta['def-debuff'] ?? meta['defDebuff']) || 0,
        sdefBuff: Number(meta['spd-buff'] ?? meta['sdefBuff']) || 0,
        sdefDebuff: Number(meta['spd-debuff'] ?? meta['sdefDebuff']) || 0,
        happy: Number(meta['happiness-curr'] ?? meta['happy']) || 0,
        loyal: Number(meta['loyalty-curr'] ?? meta['loyal']) || 0
    };
}

export function parseExtras(meta: Record<string, unknown>) {
    return {
        core: Number(meta['extra-core']) || 0,
        social: Number(meta['extra-social']) || 0,
        skill: Number(meta['extra-skill']) || 0
    };
}

