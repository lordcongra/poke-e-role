// src/utils/generatorUtils.ts
import type { TempBuild, TempMove, CharacterState, GeneratorConfig } from '../store/storeTypes';
import { fetchPokemonData, fetchMoveData, MOVES_URLS } from './api';
import { getRankPoints, getAgePoints } from '../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../types/enums';

const COMBAT_STATS = Object.values(CombatStat) as string[];
const SOCIAL_STATS = Object.values(SocialStat) as string[];
const ALL_SKILLS = Object.values(Skill) as string[];
const RANK_HIERARCHY = ["Starter", "Beginner", "Rookie", "Amateur", "Standard", "Advanced", "Expert", "Ace", "Master", "Champion"];

const ATTRIBUTE_MAPPING: Record<string, string> = {
    "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins",
    "Tough": "tou", "Cool": "coo", "Beauty": "bea", "Cute": "cut", "Clever": "cle", "Will": "will"
};

function normalizeStat(val: string): string {
    const s = val.toLowerCase();
    if (s.includes('str')) return 'str'; if (s.includes('dex')) return 'dex';
    if (s.includes('vit')) return 'vit'; if (s.includes('spe')) return 'spe';
    if (s.includes('ins')) return 'ins'; if (s.includes('tou')) return 'tou';
    if (s.includes('coo')) return 'coo'; if (s.includes('bea')) return 'bea';
    if (s.includes('cut')) return 'cut'; if (s.includes('cle')) return 'cle';
    return '';
}

function normalizeSkill(val: string): string {
    const s = val.toLowerCase();
    for (const sk of ALL_SKILLS) { if (s.includes(sk)) return sk; }
    return 'brawl';
}

export async function generateBuild(config: GeneratorConfig, state: CharacterState): Promise<TempBuild | null> {
    const speciesName = state.identity.species;
    if (!speciesName) return null;

    const pokemonData = await fetchPokemonData(speciesName);
    if (!pokemonData) return null;

    const rank = state.identity.rank;
    
    const { core: rankCore, social: rankSoc, skills: rankSkill, skillLimit } = getRankPoints(rank);
    const { core: ageCore, social: ageSoc } = getAgePoints(state.identity.age);

    let attrPoints = rankCore + ageCore;
    let socPoints = rankSoc + ageSoc;
    let skillPoints = rankSkill;
    const maxSkillRank = skillLimit;

    const attrLimits: Record<string, number> = {
        str: state.stats[CombatStat.STR].limit, 
        dex: state.stats[CombatStat.DEX].limit, 
        vit: state.stats[CombatStat.VIT].limit, 
        spe: state.stats[CombatStat.SPE].limit, 
        ins: state.stats[CombatStat.INS].limit
    };

    const genAttr: Record<string, number> = { str: 0, dex: 0, vit: 0, spe: 0, ins: 0 };
    const genSoc: Record<string, number> = { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 };
    const genSkill: Record<string, number> = {};
    
    const customSkillsList: string[] = [];
    const customSkillMap: Record<string, string> = {};
    
    state.extraCategories.forEach((cat) => {
        cat.skills.forEach((sk) => { customSkillsList.push(sk.id); customSkillMap[sk.id] = sk.name; });
    });

    ALL_SKILLS.forEach(sk => genSkill[sk] = 0);
    customSkillsList.forEach(sk => genSkill[sk] = 0);

    const myTypes = [state.identity.type1, state.identity.type2].filter(t => t && t !== "None");

    const baseIns = state.stats[CombatStat.INS].base;
    const totalTargetMoves = config.targetAtkCount + config.targetSupCount;
    let neededInsRank = Math.max(0, (totalTargetMoves - 3) - baseIns);
    neededInsRank = Math.min(neededInsRank, attrLimits['ins'] - baseIns, attrPoints);
    genAttr['ins'] = neededInsRank;
    attrPoints -= neededInsRank;

    const currentRankIdx = Math.max(0, RANK_HIERARCHY.indexOf(rank));
    const isMoveAllowed = (moveRankRaw: string) => {
        const rIdx = RANK_HIERARCHY.indexOf(moveRankRaw.trim());
        return rIdx !== -1 && rIdx <= currentRankIdx;
    };

    const legalMoveNames: string[] = [];
    const pd = pokemonData as Record<string, unknown>;
    
    // AUDIT FIX: Plumbed ignoreRank to actually bypass the filter when it gets desperate!
    const extractMoves = (moveObj: unknown, ignoreRank = false) => {
        if (Array.isArray(moveObj)) {
            moveObj.forEach((m: unknown) => {
                const mRec = m as Record<string, unknown>;
                const mName = typeof m === 'string' ? m : String(mRec.Name || mRec.Move || "");
                const mRank = typeof m === 'object' ? String(mRec.Learned || mRec.Learn || mRec.Level || mRec.Rank || "Other") : "Other";
                if (mName && MOVES_URLS[mName.toLowerCase()] && (ignoreRank || isMoveAllowed(mRank))) legalMoveNames.push(mName);
            });
        } else if (typeof moveObj === 'object' && moveObj !== null) {
            Object.entries(moveObj).forEach(([mRank, mList]) => {
                if ((ignoreRank || isMoveAllowed(mRank)) && Array.isArray(mList)) {
                    mList.forEach((m: unknown) => {
                        const mName = typeof m === 'string' ? m : String((m as Record<string, unknown>).Name || (m as Record<string, unknown>).Move || "");
                        if (mName && MOVES_URLS[mName.toLowerCase()]) legalMoveNames.push(mName);
                    });
                }
            });
        }
    };
    extractMoves(pd.Moves, false);
    if (legalMoveNames.length === 0) extractMoves(pd.Moves, true); 

    const uniqueMoveNames = [...new Set(legalMoveNames)];
    const fetchedMoves: TempMove[] = [];
    for (const mName of uniqueMoveNames) {
        const data = await fetchMoveData(mName);
        if (data) {
            let rawCat = String(data.Category || "Physical");
            fetchedMoves.push({
                id: crypto.randomUUID(), name: mName, type: String(data.Type || "Normal"),
                cat: rawCat === "Physical" ? "Phys" : (rawCat === "Special" ? "Spec" : "Status"),
                power: Number(data.Power) || 0, desc: String(data.Effect || data.Description || ""),
                dmgStat: normalizeStat(ATTRIBUTE_MAPPING[String(data.Damage1 || "")] || String(data.Damage1 || "")),
                attr: normalizeStat(ATTRIBUTE_MAPPING[String(data.Accuracy1 || "")] || String(data.Accuracy1 || "")) || 'str',
                skill: normalizeSkill(String(data.Accuracy2 || ""))
            });
        }
    }

    const draftedMoves: TempMove[] = [];
    let supportPool = fetchedMoves.filter(m => m.cat === 'Status');
    let attackPool = fetchedMoves.filter(m => m.cat === 'Phys' || m.cat === 'Spec');
    
    if (config.buildType === 'wild') {
        let availableMoves = [...fetchedMoves].sort(() => 0.5 - Math.random());
        const actualMaxMoves = baseIns + genAttr['ins'] + 3;
        for (let i = 0; i < actualMaxMoves && availableMoves.length > 0; i++) {
            const move = availableMoves.shift();
            if (move) draftedMoves.push(move);
        }
    } else {
        if (config.combatBias === 'physical') attackPool = attackPool.filter(m => m.cat === 'Phys');
        if (config.combatBias === 'special') attackPool = attackPool.filter(m => m.cat === 'Spec');
        
        const getDefensiveScore = (move: TempMove) => {
            let score = 0;
            const text = (move.name + " " + move.desc).toLowerCase();
            const keywords = ['protect', 'shield', 'guard', 'block', 'barrier', 'defense', 'sp. def', 'heal', 'recover', 'roost', 'synthesis', 'light screen', 'reflect'];
            for (const kw of keywords) { if (text.includes(kw)) score += 1; }
            return score;
        };

        if (config.combatBias === 'tank') supportPool.sort((a, b) => getDefensiveScore(b) - getDefensiveScore(a));
        else supportPool.sort(() => 0.5 - Math.random());

        for (let i = 0; i < config.targetSupCount && supportPool.length > 0; i++) {
            const move = supportPool.shift();
            if (move) draftedMoves.push(move);
        }

        attackPool.sort((a, b) => {
            let aBias = 0, bBias = 0;
            if (config.combatBias === 'physical') { aBias = a.cat === 'Phys' ? 1 : 0; bBias = b.cat === 'Phys' ? 1 : 0; } 
            else if (config.combatBias === 'special') { aBias = a.cat === 'Spec' ? 1 : 0; bBias = b.cat === 'Spec' ? 1 : 0; }
            if (aBias !== bBias) return bBias - aBias;
            const aStab = myTypes.includes(a.type) ? 1 : 0; const bStab = myTypes.includes(b.type) ? 1 : 0;
            if (aStab !== bStab) return bStab - aStab;
            return b.power - a.power;
        });

        const coveredTypes = new Set<string>();
        let remainingAtkSlots = config.targetAtkCount + (config.targetSupCount - draftedMoves.length);
        for (const move of attackPool) {
            if (remainingAtkSlots <= 0) break;
            if (!coveredTypes.has(move.type) || myTypes.includes(move.type)) {
                draftedMoves.push(move); coveredTypes.add(move.type); remainingAtkSlots--;
            }
        }
        
        let leftoverPool = fetchedMoves.filter(m => !draftedMoves.includes(m));
        if (config.buildType === 'minmax') leftoverPool.sort((a,b) => b.power - a.power);
        else leftoverPool.sort(() => 0.5 - Math.random());

        const draftedMax = baseIns + genAttr['ins'] + 3;
        while (draftedMoves.length < draftedMax && leftoverPool.length > 0) {
            const move = leftoverPool.shift();
            if (move) draftedMoves.push(move);
        }
    }

    if (config.buildType === 'wild') {
        const attrsToAssign = [...COMBAT_STATS];
        while (attrPoints > 0 && attrsToAssign.length > 0) {
            const randomAttr = attrsToAssign[Math.floor(Math.random() * attrsToAssign.length)];
            const currentRank = genAttr[randomAttr];
            const base = state.stats[randomAttr as CombatStat].base;
            if (currentRank + base < attrLimits[randomAttr]) { genAttr[randomAttr]++; attrPoints--; } 
            else { attrsToAssign.splice(attrsToAssign.indexOf(randomAttr), 1); }
        }

        const socsToAssign = [...SOCIAL_STATS];
        while (socPoints > 0 && socsToAssign.length > 0) {
            const randomSoc = socsToAssign[Math.floor(Math.random() * socsToAssign.length)];
            const currentRank = genSoc[randomSoc];
            const base = state.socials[randomSoc as SocialStat].base;
            if (currentRank + base < 5) { genSoc[randomSoc]++; socPoints--; } 
            else { socsToAssign.splice(socsToAssign.indexOf(randomSoc), 1); }
        }

        const pmdSkillsList = ['crafts', 'lore', 'medicine', 'magic'];
        let skillsToAssign: string[] = config.includePmd ? [...ALL_SKILLS] : ALL_SKILLS.filter(s => !pmdSkillsList.includes(s));
        if (config.includeCustom) skillsToAssign = [...skillsToAssign, ...customSkillsList];

        while (skillPoints > 0 && skillsToAssign.length > 0) {
            const randomSk = skillsToAssign[Math.floor(Math.random() * skillsToAssign.length)];
            if (genSkill[randomSk] < maxSkillRank) { genSkill[randomSk]++; skillPoints--; } 
            else { skillsToAssign.splice(skillsToAssign.indexOf(randomSk), 1); }
        }
    } else if (config.buildType === 'minmax') {
        const requiredAttrs: Record<string, number> = { str: 0, dex: 0, vit: 0, spe: 0, ins: 0 };
        const requiredSocs: Record<string, number> = { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 };
        const requiredSkills: Record<string, number> = {};

        draftedMoves.forEach(m => {
            if (m.attr) {
                if (requiredAttrs[m.attr] !== undefined) requiredAttrs[m.attr] += 2;
                else if (requiredSocs[m.attr] !== undefined) requiredSocs[m.attr] += 2;
            }
            if (m.dmgStat) {
                if (requiredAttrs[m.dmgStat] !== undefined) requiredAttrs[m.dmgStat] += 2;
                else if (requiredSocs[m.dmgStat] !== undefined) requiredSocs[m.dmgStat] += 2;
            }
            if (m.skill) requiredSkills[m.skill] = (requiredSkills[m.skill] || 0) + 2;
        });

        if (config.combatBias === 'tank') { requiredAttrs['vit'] += 4; requiredAttrs['ins'] += 4; } 
        else if (config.combatBias === 'physical') { requiredAttrs['str'] += 2; } 
        else if (config.combatBias === 'special') { requiredAttrs['spe'] += 2; }

        let availableAttrs = Object.keys(requiredAttrs).filter(a => requiredAttrs[a] > 0);
        while (attrPoints > 0 && availableAttrs.length > 0) {
            const maxWeight = Math.max(...availableAttrs.map(a => requiredAttrs[a]));
            let topTierAttrs = availableAttrs.filter(a => requiredAttrs[a] === maxWeight);
            let assignedInLoop = false;
            for (const attr of topTierAttrs) {
                if (attrPoints <= 0) break;
                const base = state.stats[attr as CombatStat].base;
                if (genAttr[attr] + base < attrLimits[attr]) { genAttr[attr]++; attrPoints--; assignedInLoop = true; }
            }
            if (!assignedInLoop) availableAttrs = availableAttrs.filter(a => !topTierAttrs.includes(a));
        }

        const dumpList = config.combatBias === 'special' ? ['spe', 'dex', 'vit', 'ins', 'str'] : ['str', 'dex', 'vit', 'ins', 'spe'];
        for (const attr of dumpList) {
            while (attrPoints > 0) {
                const base = state.stats[attr as CombatStat].base;
                if (genAttr[attr] + base < attrLimits[attr]) { genAttr[attr]++; attrPoints--; } else break;
            }
        }

        let availableSocs = Object.keys(requiredSocs).filter(s => requiredSocs[s] > 0);
        while (socPoints > 0 && availableSocs.length > 0) {
            const maxWeight = Math.max(...availableSocs.map(soc => requiredSocs[soc]));
            let topTierSocs = availableSocs.filter(soc => requiredSocs[soc] === maxWeight);
            let assignedInLoop = false;
            for (const soc of topTierSocs) {
                if (socPoints <= 0) break;
                const base = state.socials[soc as SocialStat].base;
                if (genSoc[soc] + base < 5) { genSoc[soc]++; socPoints--; assignedInLoop = true; }
            }
            if (!assignedInLoop) availableSocs = availableSocs.filter(soc => !topTierSocs.includes(soc));
        }

        const dumpSocs = [...SOCIAL_STATS];
        while (socPoints > 0 && dumpSocs.length > 0) {
            const randomSoc = dumpSocs[Math.floor(Math.random() * dumpSocs.length)];
            const base = state.socials[randomSoc as SocialStat].base;
            if (genSoc[randomSoc] + base < 5) { genSoc[randomSoc]++; socPoints--; } else dumpSocs.splice(dumpSocs.indexOf(randomSoc), 1);
        }

        const pmdSkillsList = ['crafts', 'lore', 'medicine', 'magic'];
        const validSkills: string[] = [...ALL_SKILLS, ...(config.includeCustom ? customSkillsList : [])].filter(s => config.includePmd || !pmdSkillsList.includes(s));
        
        let availableSkills = Object.keys(requiredSkills).filter(sk => validSkills.includes(sk));
        while (skillPoints > 0 && availableSkills.length > 0) {
            const maxWeight = Math.max(...availableSkills.map(sk => requiredSkills[sk]));
            let topTierSkills = availableSkills.filter(sk => requiredSkills[sk] === maxWeight);
            let assignedInLoop = false;
            for (const sk of topTierSkills) {
                if (skillPoints <= 0) break;
                if (genSkill[sk] < maxSkillRank) { genSkill[sk]++; skillPoints--; assignedInLoop = true; }
            }
            if (!assignedInLoop) availableSkills = availableSkills.filter(sk => !topTierSkills.includes(sk));
        }

        const totalDex = state.stats[CombatStat.DEX].base + genAttr['dex'];
        const totalStr = state.stats[CombatStat.STR].base + genAttr['str'];
        const totalSpe = state.stats[CombatStat.SPE].base + genAttr['spe'];
        const utilitySkills = [];
        if (totalDex >= Math.max(totalStr, totalSpe)) utilitySkills.push('evasion'); else utilitySkills.push('clash');
        utilitySkills.push('alert', 'athletic', 'stealth');
        
        for (const sk of utilitySkills) {
            if (!validSkills.includes(sk)) continue;
            while (skillPoints > 0 && genSkill[sk] < Math.min(3, maxSkillRank)) { genSkill[sk]++; skillPoints--; }
        }
        while (skillPoints > 0 && validSkills.length > 0) {
            const randomSk = validSkills[Math.floor(Math.random() * validSkills.length)];
            if (genSkill[randomSk] < maxSkillRank) { genSkill[randomSk]++; skillPoints--; } else validSkills.splice(validSkills.indexOf(randomSk), 1);
        }
    } else if (config.buildType === 'average') {
        const coreAttrs = new Set<string>();
        const coreSocs = new Set<string>();
        const coreSkills = new Set<string>();
        draftedMoves.slice(0, 2).forEach(m => {
            if (m.attr) { if (COMBAT_STATS.includes(m.attr)) coreAttrs.add(m.attr); else coreSocs.add(m.attr); }
            if (m.dmgStat) { if (COMBAT_STATS.includes(m.dmgStat)) coreAttrs.add(m.dmgStat); else coreSocs.add(m.dmgStat); }
            if (m.skill) coreSkills.add(m.skill);
        });
        if (config.combatBias === 'tank') { coreAttrs.add('vit'); coreAttrs.add('ins'); }

        for (const attr of coreAttrs) {
            const targetRank = Math.max(1, Math.ceil((attrLimits[attr] - state.stats[attr as CombatStat].base) / 2));
            while (attrPoints > 0 && genAttr[attr] < targetRank) { genAttr[attr]++; attrPoints--; }
        }
        for (const soc of coreSocs) {
            const targetRank = Math.max(1, Math.ceil((5 - state.socials[soc as SocialStat].base) / 2));
            while (socPoints > 0 && genSoc[soc] < targetRank) { genSoc[soc]++; socPoints--; }
        }
        const targetSkillBoost = Math.max(1, Math.ceil(maxSkillRank / 2));
        for (const sk of coreSkills) {
            while (skillPoints > 0 && genSkill[sk] < targetSkillBoost) { genSkill[sk]++; skillPoints--; }
        }

        const remainingAttrs = [...COMBAT_STATS];
        while (attrPoints > 0 && remainingAttrs.length > 0) {
            const rAttr = remainingAttrs[Math.floor(Math.random() * remainingAttrs.length)];
            if (genAttr[rAttr] + state.stats[rAttr as CombatStat].base < attrLimits[rAttr]) { genAttr[rAttr]++; attrPoints--; } else remainingAttrs.splice(remainingAttrs.indexOf(rAttr), 1);
        }
        const remainingSocs = [...SOCIAL_STATS];
        while (socPoints > 0 && remainingSocs.length > 0) {
            const rSoc = remainingSocs[Math.floor(Math.random() * remainingSocs.length)];
            if (genSoc[rSoc] + state.socials[rSoc as SocialStat].base < 5) { genSoc[rSoc]++; socPoints--; } else remainingSocs.splice(remainingSocs.indexOf(rSoc), 1);
        }
        const pmdSkillsList = ['crafts', 'lore', 'medicine', 'magic'];
        const validSkills: string[] = [...ALL_SKILLS, ...(config.includeCustom ? customSkillsList : [])].filter(s => config.includePmd || !pmdSkillsList.includes(s));
        while (skillPoints > 0 && validSkills.length > 0) {
            const rSk = validSkills[Math.floor(Math.random() * validSkills.length)];
            if (genSkill[rSk] < maxSkillRank) { genSkill[rSk]++; skillPoints--; } else validSkills.splice(validSkills.indexOf(rSk), 1);
        }
    }

    return {
        species: speciesName, attr: genAttr, soc: genSoc, skills: genSkill,
        customSkillsList: customSkillsList, customSkillMap: customSkillMap,
        moves: draftedMoves, maxMoves: baseIns + genAttr['ins'] + 3,
        includePmd: config.includePmd 
    };
}