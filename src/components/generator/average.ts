import { appState } from '../../state';
import { sheetView } from '../../view';
import { COMBAT_STATS, SOCIAL_STATS, ALL_SKILLS, generateId } from '../../utils';
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

export async function generateAverageBuild(): Promise<TempBuild | null> {
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
    
    // --- STEP 2: GATHER LEGAL MOVES ---
    const currentRankIdx = Math.max(0, RANK_HIERARCHY.indexOf(rank));
    const isMoveAllowed = (moveRankRaw: string) => {
        const rIdx = RANK_HIERARCHY.indexOf(moveRankRaw.trim());
        return rIdx !== -1 && rIdx <= currentRankIdx;
    };

    const legalMoveNames: string[] = [];
    const pd = pokemonData as Record<string, unknown>;
    
    const extractMoves = (moveObj: unknown) => {
        if (Array.isArray(moveObj)) {
            moveObj.forEach((m: unknown) => {
                const mRec = m as Record<string, unknown>;
                if (isMoveAllowed(String(mRec.Learned || mRec.Learn || mRec.Level || mRec.Rank || "Other"))) {
                    legalMoveNames.push(typeof m === 'string' ? m : String(mRec.Name || mRec.Move || ""));
                }
            });
        } else if (typeof moveObj === 'object' && moveObj !== null) {
            Object.entries(moveObj).forEach(([mRank, mList]) => {
                if (isMoveAllowed(mRank) && Array.isArray(mList)) {
                    mList.forEach((m: unknown) => {
                        legalMoveNames.push(typeof m === 'string' ? m : String((m as Record<string, unknown>).Name || (m as Record<string, unknown>).Move || ""));
                    });
                }
            });
        }
    };
    extractMoves(pd.Moves);
    if (legalMoveNames.length === 0) extractMoves(pd.Moves); 

    const uniqueMoveNames = [...new Set(legalMoveNames)].filter(m => MOVES_URLS[m.toLowerCase()]);
    
    const fetchedMoves: TempMove[] = [];
    for (const mName of uniqueMoveNames) {
        const data = await fetchMoveData(mName);
        if (data) {
            let rawCat = String(data.Category || "Physical");
            fetchedMoves.push({
                id: generateId(), name: mName, type: String(data.Type || "Normal"),
                cat: rawCat === "Physical" ? "Phys" : (rawCat === "Special" ? "Spec" : "Supp"),
                power: Number(data.Power) || 0, desc: String(data.Effect || data.Description || ""),
                dmgStat: normalizeStat(ATTRIBUTE_MAPPING[String(data.Damage1 || "")] || String(data.Damage1 || "")),
                attr: normalizeStat(ATTRIBUTE_MAPPING[String(data.Accuracy1 || "")] || String(data.Accuracy1 || "")) || 'str',
                skill: normalizeSkill(String(data.Accuracy2 || ""))
            });
        }
    }

    // --- STEP 3: DRAFT MOVES (Core Identity + Random) ---
    const draftedMoves: TempMove[] = [];
    let supportPool = fetchedMoves.filter(m => m.cat === 'Supp');
    let attackPool = fetchedMoves.filter(m => m.cat === 'Phys' || m.cat === 'Spec').sort(() => 0.5 - Math.random());

    // DEFENSIVE SCORING LOGIC
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

    // Bias Check for Core Attack
    if (combatBias === 'physical') attackPool.sort((a, b) => (b.cat === 'Phys' ? 1 : 0) - (a.cat === 'Phys' ? 1 : 0));
    if (combatBias === 'special') attackPool.sort((a, b) => (b.cat === 'Spec' ? 1 : 0) - (a.cat === 'Spec' ? 1 : 0));

    // Draft up to 2 Core Moves (Preferably STAB)
    attackPool.sort((a, b) => (myTypes.includes(b.type) ? 1 : 0) - (myTypes.includes(a.type) ? 1 : 0));
    
    const coreMoves: TempMove[] = [];
    if (targetAtkCount > 0 && attackPool.length > 0) coreMoves.push(attackPool.shift()!);
    if (targetSupCount > 0 && supportPool.length > 0) coreMoves.push(supportPool.shift()!);
    else if (targetAtkCount > 1 && attackPool.length > 0) coreMoves.push(attackPool.shift()!);

    draftedMoves.push(...coreMoves);

    // Draft the rest randomly
    let remainingAtkSlots = Math.max(0, targetAtkCount - draftedMoves.filter(m => m.cat !== 'Supp').length);
    let remainingSupSlots = Math.max(0, targetSupCount - draftedMoves.filter(m => m.cat === 'Supp').length);

    // If it's a tank, re-sort the remaining support pool so it isn't guaranteed a shield if it asks for a ton of support moves.
    if (combatBias === 'tank') supportPool.sort(() => 0.5 - Math.random());

    while (remainingSupSlots > 0 && supportPool.length > 0) { draftedMoves.push(supportPool.shift()!); remainingSupSlots--; }
    while (remainingAtkSlots > 0 && attackPool.length > 0) { draftedMoves.push(attackPool.shift()!); remainingAtkSlots--; }

    const draftedMax = baseIns + genAttr['ins'] + 3;
    let leftoverPool = [...attackPool, ...supportPool].sort(() => 0.5 - Math.random());
    while (draftedMoves.length < draftedMax && leftoverPool.length > 0) {
        draftedMoves.push(leftoverPool.shift()!);
    }

    // --- STEP 4: INVEST IN CORE MOVES ONLY ---
    const coreAttrs = new Set<string>();
    const coreSocs = new Set<string>();
    const coreSkills = new Set<string>();

    coreMoves.forEach(m => {
        if (m.attr) { if ((COMBAT_STATS as string[]).includes(m.attr)) coreAttrs.add(m.attr); else coreSocs.add(m.attr); }
        if (m.dmgStat) { if ((COMBAT_STATS as string[]).includes(m.dmgStat)) coreAttrs.add(m.dmgStat); else coreSocs.add(m.dmgStat); }
        if (m.skill) coreSkills.add(m.skill);
    });

    if (combatBias === 'tank') { coreAttrs.add('vit'); coreAttrs.add('ins'); }

    // Boost Core Attributes "Pretty Good" (up to Math.ceil(limit / 2))
    for (const attr of coreAttrs) {
        const targetRank = Math.max(1, Math.ceil((attrLimits[attr] - (parseInt(sheetView.stats[attr].base.value) || 1)) / 2));
        while (attrPoints > 0 && genAttr[attr] < targetRank) { genAttr[attr]++; attrPoints--; }
    }

    // Boost Core Socials "Pretty Good" (up to 2 points)
    for (const soc of coreSocs) {
        const targetRank = Math.max(1, Math.ceil((5 - (parseInt(sheetView.stats[soc].base.value) || 1)) / 2));
        while (socPoints > 0 && genSoc[soc] < targetRank) { genSoc[soc]++; socPoints--; }
    }

    // Boost Core Skills "Pretty Good" (up to Math.ceil(maxSkillRank / 2))
    const targetSkillBoost = Math.max(1, Math.ceil(maxSkillRank / 2));
    for (const sk of coreSkills) {
        while (skillPoints > 0 && genSkill[sk] < targetSkillBoost) { genSkill[sk]++; skillPoints--; }
    }

    // --- STEP 5: RANDOM CHAOS FOR THE REST ---
    const remainingAttrs = [...COMBAT_STATS] as string[];
    while (attrPoints > 0 && remainingAttrs.length > 0) {
        const rAttr = remainingAttrs[Math.floor(Math.random() * remainingAttrs.length)];
        const base = parseInt(sheetView.stats[rAttr].base.value) || 1;
        if (genAttr[rAttr] + base < attrLimits[rAttr]) { genAttr[rAttr]++; attrPoints--; } 
        else remainingAttrs.splice(remainingAttrs.indexOf(rAttr), 1);
    }

    const remainingSocs = [...SOCIAL_STATS] as string[];
    while (socPoints > 0 && remainingSocs.length > 0) {
        const rSoc = remainingSocs[Math.floor(Math.random() * remainingSocs.length)];
        const base = parseInt(sheetView.stats[rSoc].base.value) || 1;
        if (genSoc[rSoc] + base < 5) { genSoc[rSoc]++; socPoints--; } 
        else remainingSocs.splice(remainingSocs.indexOf(rSoc), 1);
    }

    const pmdSkillsList = ['crafts', 'lore', 'medicine', 'magic'];
    const validSkills: string[] = [...(ALL_SKILLS as string[]), ...(includeCustom ? customSkillsList : [])].filter(s => includePmd || !pmdSkillsList.includes(s));
    while (skillPoints > 0 && validSkills.length > 0) {
        const rSk = validSkills[Math.floor(Math.random() * validSkills.length)];
        if (genSkill[rSk] < maxSkillRank) { genSkill[rSk]++; skillPoints--; } 
        else validSkills.splice(validSkills.indexOf(rSk), 1);
    }

    // --- STEP 6: FINAL MOVE BACKFILL ---
    const actualMaxMoves = baseIns + genAttr['ins'] + 3;
    leftoverPool = fetchedMoves.filter(m => !draftedMoves.includes(m)).sort(() => 0.5 - Math.random());
    while (draftedMoves.length < actualMaxMoves && leftoverPool.length > 0) {
        draftedMoves.push(leftoverPool.shift()!);
    }

    return {
        species: speciesName, attr: genAttr, soc: genSoc, skills: genSkill,
        customSkillsList: customSkillsList, customSkillMap: customSkillMap,
        moves: draftedMoves, maxMoves: actualMaxMoves
    };
}