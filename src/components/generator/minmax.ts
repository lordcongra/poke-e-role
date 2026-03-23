import { appState } from '../../state';
import { sheetView } from '../../view';
import { SOCIAL_STATS, ALL_SKILLS, generateId } from '../../utils';
import { fetchPokemonData, fetchMoveData, MOVES_URLS } from '../../api';
import { ATTRIBUTE_MAPPING } from '../../@types/index';
import { RANK_CAPS, AGE_CAPS, RANK_HIERARCHY, type TempBuild, type TempMove } from './shared';

// DATA SANITIZERS
function normalizeStat(val: string): string {
    const s = val.toLowerCase();
    if (s.includes('str')) return 'str';
    if (s.includes('dex')) return 'dex';
    if (s.includes('vit')) return 'vit';
    if (s.includes('spe')) return 'spe';
    if (s.includes('ins')) return 'ins';
    if (s.includes('tou')) return 'tou';
    if (s.includes('coo')) return 'coo';
    if (s.includes('bea')) return 'bea';
    if (s.includes('cut')) return 'cut';
    if (s.includes('cle')) return 'cle';
    return '';
}

function normalizeSkill(val: string): string {
    const s = val.toLowerCase();
    for (const sk of ALL_SKILLS) {
        if (s.includes(sk)) return sk;
    }
    return 'brawl';
}

export async function generateMinMaxBuild(): Promise<TempBuild | null> {
    const speciesName = sheetView.identity.species.value;
    if (!speciesName) return null;

    const pokemonData = await fetchPokemonData(speciesName);
    if (!pokemonData) return null;

    const rank = sheetView.identity.rank.value || "Starter";
    const age = sheetView.identity.age.value || "--";
    const rankData = RANK_CAPS[rank] || RANK_CAPS["Starter"];
    const ageData = AGE_CAPS[age] || AGE_CAPS["--"];
    
    const includePmd = (document.getElementById('generator-include-pmd') as HTMLInputElement)?.checked;
    const includeCustom = (document.getElementById('generator-include-custom') as HTMLInputElement)?.checked;
    
    const combatBias = (document.getElementById('generator-focus') as HTMLSelectElement)?.value || 'balanced';
    const targetAtkCount = parseInt((document.getElementById('generator-atk-moves') as HTMLInputElement)?.value) || 0;
    const targetSupCount = parseInt((document.getElementById('generator-sup-moves') as HTMLInputElement)?.value) || 0;
    const totalTargetMoves = targetAtkCount + targetSupCount;

    let attrPoints = rankData.attr + ageData.attr;
    let socPoints = rankData.soc + ageData.soc;
    let skillPoints = rankData.skill;
    const maxSkillRank = rankData.skillLimit;

    const attrLimits: Record<string, number> = {
        str: parseInt((document.getElementById('str-limit') as HTMLInputElement)?.value || "5"),
        dex: parseInt((document.getElementById('dex-limit') as HTMLInputElement)?.value || "5"),
        vit: parseInt((document.getElementById('vit-limit') as HTMLInputElement)?.value || "5"),
        spe: parseInt((document.getElementById('spe-limit') as HTMLInputElement)?.value || "5"),
        ins: parseInt((document.getElementById('ins-limit') as HTMLInputElement)?.value || "5"),
    };

    const genAttr: Record<string, number> = { str: 0, dex: 0, vit: 0, spe: 0, ins: 0 };
    const genSoc: Record<string, number> = { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 };
    const genSkill: Record<string, number> = {};
    
    const customSkillsList: string[] = [];
    const customSkillMap: Record<string, string> = {};
    appState.currentExtraCategories.forEach(cat => {
        cat.skills.forEach(sk => { customSkillsList.push(sk.id); customSkillMap[sk.id] = sk.name; });
    });

    ALL_SKILLS.forEach(sk => genSkill[sk] = 0);
    customSkillsList.forEach(sk => genSkill[sk] = 0);

    const type1 = sheetView.identity.type1.value;
    const type2 = sheetView.identity.type2.value;
    const myTypes = [type1, type2].filter(t => t && t !== "None");

    // --- STEP 1: FORCE MINIMUM INSIGHT ---
    const baseIns = parseInt(sheetView.stats.ins.base.value) || 1;
    let neededInsRank = Math.max(0, (totalTargetMoves - 3) - baseIns);
    neededInsRank = Math.min(neededInsRank, attrLimits['ins'] - baseIns, attrPoints);
    genAttr['ins'] = neededInsRank;
    attrPoints -= neededInsRank;
    
    // --- STEP 2: GATHER AND FILTER LEGAL MOVES ---
    const currentRankIdx = Math.max(0, RANK_HIERARCHY.indexOf(rank));
    const isMoveAllowed = (moveRankRaw: string) => {
        const cleanRank = moveRankRaw.trim();
        const rIdx = RANK_HIERARCHY.indexOf(cleanRank);
        return rIdx !== -1 && rIdx <= currentRankIdx;
    };

    const legalMoveNames: string[] = [];
    const pd = pokemonData as Record<string, unknown>;
    
    const extractMoves = (moveObj: unknown) => {
        if (Array.isArray(moveObj)) {
            moveObj.forEach((m: unknown) => {
                const mRec = m as Record<string, unknown>;
                const mName = typeof m === 'string' ? m : String(mRec.Name || mRec.Move || "");
                const mRank = typeof m === 'object' ? String(mRec.Learned || mRec.Learn || mRec.Level || mRec.Rank || "Other") : "Other";
                if (mName && MOVES_URLS[mName.toLowerCase()] && isMoveAllowed(mRank)) legalMoveNames.push(mName);
            });
        } else if (typeof moveObj === 'object' && moveObj !== null) {
            Object.entries(moveObj).forEach(([mRank, mList]) => {
                if (isMoveAllowed(mRank) && Array.isArray(mList)) {
                    mList.forEach((m: unknown) => {
                        const mRec = m as Record<string, unknown>;
                        const mName = typeof m === 'string' ? m : String(mRec.Name || mRec.Move || "");
                        if (mName && MOVES_URLS[mName.toLowerCase()]) legalMoveNames.push(mName);
                    });
                }
            });
        }
    };
    extractMoves(pd.Moves);
    if (legalMoveNames.length === 0) extractMoves(pd.Moves); 

    const uniqueMoveNames = [...new Set(legalMoveNames)];
    
    const fetchedMoves: TempMove[] = [];
    for (const mName of uniqueMoveNames) {
        const data = await fetchMoveData(mName);
        if (data) {
            let rawCat = String(data.Category || "Physical");
            const cat = rawCat === "Physical" ? "Phys" : (rawCat === "Special" ? "Spec" : "Supp");
            
            const rawDmg = String(data.Damage1 === "None" ? "" : (data.Damage1 || ""));
            const accuracyOne = String(data.Accuracy1 || "");
            const accuracyTwo = String(data.Accuracy2 || "");
            
            fetchedMoves.push({
                id: generateId(),
                name: mName,
                type: String(data.Type || "Normal"),
                cat: cat,
                power: Number(data.Power) || 0,
                desc: String(data.Effect || data.Description || ""),
                dmgStat: normalizeStat(ATTRIBUTE_MAPPING[rawDmg] || rawDmg),
                attr: normalizeStat(ATTRIBUTE_MAPPING[accuracyOne] || accuracyOne) || 'str',
                skill: normalizeSkill(accuracyTwo)
            });
        }
    }

    // --- STEP 3: DRAFT MOVES ---
    const draftedMoves: TempMove[] = [];
    let supportPool = fetchedMoves.filter(m => m.cat === 'Supp');
    let attackPool = fetchedMoves.filter(m => m.cat === 'Phys' || m.cat === 'Spec');

    if (combatBias === 'physical') attackPool = attackPool.filter(m => m.cat === 'Phys');
    if (combatBias === 'special') attackPool = attackPool.filter(m => m.cat === 'Spec');

    const getDefensiveScore = (move: TempMove) => {
        let score = 0;
        const text = (move.name + " " + move.desc).toLowerCase();
        const keywords = ['protect', 'shield', 'guard', 'block', 'barrier', 'defense', 'sp. def', 'heal', 'recover', 'roost', 'synthesis', 'light screen', 'reflect'];
        for (const kw of keywords) {
            if (text.includes(kw)) score += 1;
        }
        return score;
    };

    if (combatBias === 'tank') {
        supportPool.sort((a, b) => getDefensiveScore(b) - getDefensiveScore(a));
    } else {
        supportPool.sort(() => 0.5 - Math.random());
    }

    for (let i = 0; i < targetSupCount && supportPool.length > 0; i++) {
        draftedMoves.push(supportPool.shift()!);
    }

    attackPool.sort((a, b) => {
        let aBias = 0, bBias = 0;
        if (combatBias === 'physical') {
            aBias = a.cat === 'Phys' ? 1 : 0;
            bBias = b.cat === 'Phys' ? 1 : 0;
        } else if (combatBias === 'special') {
            aBias = a.cat === 'Spec' ? 1 : 0;
            bBias = b.cat === 'Spec' ? 1 : 0;
        }
        if (aBias !== bBias) return bBias - aBias;

        const aStab = myTypes.includes(a.type) ? 1 : 0;
        const bStab = myTypes.includes(b.type) ? 1 : 0;
        if (aStab !== bStab) return bStab - aStab;
        
        return b.power - a.power;
    });

    const coveredTypes = new Set<string>();
    let remainingAtkSlots = targetAtkCount + (targetSupCount - draftedMoves.length); 
    
    for (const move of attackPool) {
        if (remainingAtkSlots <= 0) break;
        if (!coveredTypes.has(move.type) || myTypes.includes(move.type)) {
            draftedMoves.push(move);
            coveredTypes.add(move.type);
            remainingAtkSlots--;
        }
    }
    
    let leftoverPool = fetchedMoves.filter(m => !draftedMoves.includes(m));
    leftoverPool.sort((a,b) => b.power - a.power);
    
    const draftedMax = baseIns + genAttr['ins'] + 3;
    while (draftedMoves.length < draftedMax && leftoverPool.length > 0) {
        draftedMoves.push(leftoverPool.shift()!);
    }

    // --- STEP 4: TALLY STATS & SKILLS ---
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

    if (combatBias === 'tank') {
        requiredAttrs['vit'] += 4;
        requiredAttrs['ins'] += 4;
    } else if (combatBias === 'physical') {
        requiredAttrs['str'] += 2;
    } else if (combatBias === 'special') {
        requiredAttrs['spe'] += 2;
    }

    // --- STEP 5: ALLOCATE ATTRIBUTES (Top-Heavy Waterfall) ---
    let availableAttrs = Object.keys(requiredAttrs).filter(a => requiredAttrs[a] > 0);
    while (attrPoints > 0 && availableAttrs.length > 0) {
        // Find the absolute highest weight remaining
        const maxWeight = Math.max(...availableAttrs.map(a => requiredAttrs[a]));
        // Get only the stats tied for that top weight
        let topTierAttrs = availableAttrs.filter(a => requiredAttrs[a] === maxWeight);

        let assignedInLoop = false;
        for (const attr of topTierAttrs) {
            if (attrPoints <= 0) break;
            const base = parseInt((document.getElementById(`${attr}-base`) as HTMLInputElement)?.value) || 1;
            if (genAttr[attr] + base < attrLimits[attr]) {
                genAttr[attr]++;
                attrPoints--;
                assignedInLoop = true;
            }
        }

        // If all top-tier stats are capped, remove them so we trickle down to the next weight tier
        if (!assignedInLoop) {
            availableAttrs = availableAttrs.filter(a => !topTierAttrs.includes(a));
        }
    }

    const dumpList = combatBias === 'special' ? ['spe', 'dex', 'vit', 'ins', 'str'] : ['str', 'dex', 'vit', 'ins', 'spe'];
    for (const attr of dumpList) {
        while (attrPoints > 0) {
            const base = parseInt((document.getElementById(`${attr}-base`) as HTMLInputElement)?.value) || 1;
            if (genAttr[attr] + base < attrLimits[attr]) {
                genAttr[attr]++;
                attrPoints--;
            } else {
                break;
            }
        }
    }

    // --- STEP 5.5: THE ORGANIC INSIGHT CHECK ---
    const finalMaxMoves = baseIns + genAttr['ins'] + 3;
    if (draftedMoves.length < finalMaxMoves) {
        let currentLeftovers = fetchedMoves.filter(m => !draftedMoves.includes(m));
        currentLeftovers.sort((a,b) => b.power - a.power);
        
        while (draftedMoves.length < finalMaxMoves && currentLeftovers.length > 0) {
            const bonusMove = currentLeftovers.shift()!;
            draftedMoves.push(bonusMove);
            
            if (bonusMove.attr) {
                if (['tou', 'coo', 'bea', 'cut', 'cle'].includes(bonusMove.attr)) {
                    requiredSocs[bonusMove.attr] = (requiredSocs[bonusMove.attr] || 0) + 2;
                }
            }
            if (bonusMove.dmgStat) {
                if (['tou', 'coo', 'bea', 'cut', 'cle'].includes(bonusMove.dmgStat)) {
                    requiredSocs[bonusMove.dmgStat] = (requiredSocs[bonusMove.dmgStat] || 0) + 2;
                }
            }
            if (bonusMove.skill) {
                requiredSkills[bonusMove.skill] = (requiredSkills[bonusMove.skill] || 0) + 2;
            }
        }
    }

    // --- STEP 6: ALLOCATE SKILLS (Top-Heavy Waterfall) ---
    const pmdSkillsList: string[] = ['crafts', 'lore', 'medicine', 'magic'];
    const validSkills: string[] = [...(ALL_SKILLS as string[]), ...(includeCustom ? customSkillsList : [])].filter(s => includePmd || !pmdSkillsList.includes(s));

    let availableSkills = Object.keys(requiredSkills).filter(sk => validSkills.includes(sk));
    while (skillPoints > 0 && availableSkills.length > 0) {
        const maxWeight = Math.max(...availableSkills.map(sk => requiredSkills[sk]));
        let topTierSkills = availableSkills.filter(sk => requiredSkills[sk] === maxWeight);

        let assignedInLoop = false;
        for (const sk of topTierSkills) {
            if (skillPoints <= 0) break;
            if (genSkill[sk] < maxSkillRank) {
                genSkill[sk]++;
                skillPoints--;
                assignedInLoop = true;
            }
        }
        
        if (!assignedInLoop) {
            availableSkills = availableSkills.filter(sk => !topTierSkills.includes(sk));
        }
    }

    const totalDex = (parseInt(sheetView.stats.dex.base.value) || 1) + genAttr['dex'];
    const totalStr = (parseInt(sheetView.stats.str.base.value) || 1) + genAttr['str'];
    const totalSpe = (parseInt(sheetView.stats.spe.base.value) || 1) + genAttr['spe'];

    const utilitySkills = [];
    if (totalDex >= Math.max(totalStr, totalSpe)) utilitySkills.push('evasion');
    else utilitySkills.push('clash');
    utilitySkills.push('alert', 'athletic', 'stealth'); 

    for (const sk of utilitySkills) {
        if (!validSkills.includes(sk)) continue;
        while (skillPoints > 0 && genSkill[sk] < Math.min(3, maxSkillRank)) { 
            genSkill[sk]++;
            skillPoints--;
        }
    }

    while (skillPoints > 0 && validSkills.length > 0) {
        const randomSk = validSkills[Math.floor(Math.random() * validSkills.length)];
        if (genSkill[randomSk] < maxSkillRank) {
            genSkill[randomSk]++;
            skillPoints--;
        } else {
            validSkills.splice(validSkills.indexOf(randomSk), 1);
        }
    }

    // --- STEP 7: ALLOCATE SOCIALS (Top-Heavy Waterfall) ---
    let availableSocs = Object.keys(requiredSocs).filter(s => requiredSocs[s] > 0);
    while (socPoints > 0 && availableSocs.length > 0) {
        const maxWeight = Math.max(...availableSocs.map(soc => requiredSocs[soc]));
        let topTierSocs = availableSocs.filter(soc => requiredSocs[soc] === maxWeight);

        let assignedInLoop = false;
        for (const soc of topTierSocs) {
            if (socPoints <= 0) break;
            const base = parseInt((document.getElementById(`${soc}-base`) as HTMLInputElement)?.value) || 1;
            if (genSoc[soc] + base < 5) { 
                genSoc[soc]++;
                socPoints--;
                assignedInLoop = true;
            }
        }
        
        if (!assignedInLoop) {
            availableSocs = availableSocs.filter(soc => !topTierSocs.includes(soc));
        }
    }

    const dumpSocs = [...SOCIAL_STATS] as string[];
    while (socPoints > 0 && dumpSocs.length > 0) {
        const randomSoc = dumpSocs[Math.floor(Math.random() * dumpSocs.length)];
        const base = parseInt((document.getElementById(`${randomSoc}-base`) as HTMLInputElement)?.value) || 1;
        if (genSoc[randomSoc] + base < 5) {
            genSoc[randomSoc]++;
            socPoints--;
        } else {
            dumpSocs.splice(dumpSocs.indexOf(randomSoc), 1);
        }
    }

    // --- STEP 8: FINAL MOVE BACKFILL ---
    const actualMaxMoves = baseIns + genAttr['ins'] + 3;
    let leftoverPoolForReal = fetchedMoves.filter(m => !draftedMoves.includes(m)); 
    while (draftedMoves.length < actualMaxMoves && leftoverPoolForReal.length > 0) {
        draftedMoves.push(leftoverPoolForReal.shift()!);
    }

    return {
        species: speciesName,
        attr: genAttr,
        soc: genSoc,
        skills: genSkill,
        customSkillsList: customSkillsList,
        customSkillMap: customSkillMap,
        moves: draftedMoves,
        maxMoves: actualMaxMoves
    };
}