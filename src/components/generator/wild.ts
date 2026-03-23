import { appState } from '../../state';
import { sheetView } from '../../view';
import { COMBAT_STATS, SOCIAL_STATS, ALL_SKILLS, generateId } from '../../utils';
import { fetchPokemonData, fetchMoveData, MOVES_URLS } from '../../api';
import { ATTRIBUTE_MAPPING } from '../../@types/index';
import { RANK_CAPS, AGE_CAPS, RANK_HIERARCHY, type TempBuild, type TempMove } from './shared';

export async function generateWildBuild(): Promise<TempBuild | null> {
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
        cat.skills.forEach(sk => {
            customSkillsList.push(sk.id);
            customSkillMap[sk.id] = sk.name;
        });
    });

    ALL_SKILLS.forEach(sk => genSkill[sk] = 0);
    customSkillsList.forEach(sk => genSkill[sk] = 0);

    // 1. Assign Attributes
    const attrsToAssign = [...COMBAT_STATS] as string[];
    while (attrPoints > 0 && attrsToAssign.length > 0) {
        const randomAttr = attrsToAssign[Math.floor(Math.random() * attrsToAssign.length)];
        const currentRank = genAttr[randomAttr];
        const base = parseInt(sheetView.stats[randomAttr].base.value) || 1;
        
        if (currentRank + base < attrLimits[randomAttr]) {
            genAttr[randomAttr]++;
            attrPoints--;
        } else {
            const idx = attrsToAssign.indexOf(randomAttr);
            if (idx > -1) attrsToAssign.splice(idx, 1);
        }
    }

    // 2. Assign Socials
    const socsToAssign = [...SOCIAL_STATS] as string[];
    while (socPoints > 0 && socsToAssign.length > 0) {
        const randomSoc = socsToAssign[Math.floor(Math.random() * socsToAssign.length)];
        const currentRank = genSoc[randomSoc];
        const base = parseInt(sheetView.stats[randomSoc].base.value) || 1;
        
        if (currentRank + base < 5) { 
            genSoc[randomSoc]++;
            socPoints--;
        } else {
            const idx = socsToAssign.indexOf(randomSoc);
            if (idx > -1) socsToAssign.splice(idx, 1);
        }
    }

    // 3. Assign Skills
    const pmdSkillsList: string[] = ['crafts', 'lore', 'medicine', 'magic'];
    let skillsToAssign: string[] = includePmd ? [...(ALL_SKILLS as string[])] : (ALL_SKILLS as string[]).filter(s => !pmdSkillsList.includes(s));
    if (includeCustom) skillsToAssign = [...skillsToAssign, ...customSkillsList];

    while (skillPoints > 0 && skillsToAssign.length > 0) {
        const randomSk = skillsToAssign[Math.floor(Math.random() * skillsToAssign.length)];
        if (genSkill[randomSk] < maxSkillRank) {
            genSkill[randomSk]++;
            skillPoints--;
        } else {
            const idx = skillsToAssign.indexOf(randomSk);
            if (idx > -1) skillsToAssign.splice(idx, 1);
        }
    }

    // 4. Gather Moves
    const baseIns = parseInt(sheetView.stats.ins.base.value) || 1;
    const totalIns = baseIns + genAttr['ins'];
    const maxMoves = totalIns + 3;

    let availableMoves: string[] = [];
    const pd = pokemonData as Record<string, unknown>;
    const currentRankIdx = Math.max(0, RANK_HIERARCHY.indexOf(rank));

    const isMoveAllowed = (moveRankRaw: string) => {
        const cleanRank = moveRankRaw.trim();
        const rIdx = RANK_HIERARCHY.indexOf(cleanRank);
        if (rIdx === -1) return false; 
        return rIdx <= currentRankIdx;
    };

    if (Array.isArray(pd.Moves)) {
        pd.Moves.forEach((m: unknown) => {
            const mRecord = m as Record<string, unknown>;
            const moveName = typeof m === 'string' ? m : String(mRecord.Name || mRecord.Move || "");
            const moveRank = typeof m === 'object' ? String(mRecord.Learned || mRecord.Learn || mRecord.Level || mRecord.Rank || "Other") : "Other";
            if (moveName && MOVES_URLS[moveName.toLowerCase()] && isMoveAllowed(moveRank)) availableMoves.push(moveName);
        });
    } else if (typeof pd.Moves === 'object' && pd.Moves !== null) {
        Object.entries(pd.Moves).forEach(([moveRank, moveList]) => {
            if (isMoveAllowed(moveRank) && Array.isArray(moveList)) {
                moveList.forEach((m: unknown) => {
                    const mRecord = m as Record<string, unknown>;
                    const moveName = typeof m === 'string' ? m : String(mRecord.Name || mRecord.Move || "");
                    if (moveName && MOVES_URLS[moveName.toLowerCase()]) availableMoves.push(moveName);
                });
            }
        });
    }

    if (availableMoves.length === 0) {
        if (Array.isArray(pd.Moves)) {
            pd.Moves.forEach((m: unknown) => {
                const mRecord = m as Record<string, unknown>;
                const moveName = typeof m === 'string' ? m : String(mRecord.Name || mRecord.Move || "");
                if (moveName && MOVES_URLS[moveName.toLowerCase()]) availableMoves.push(moveName);
            });
        }
    }

    availableMoves = [...new Set(availableMoves)]; 
    availableMoves.sort(() => 0.5 - Math.random()); 
    const selectedMoves = availableMoves.slice(0, maxMoves);

    // 5. Fetch Final Move Data
    const movePromises = selectedMoves.map(async (mName) => {
        const moveData = await fetchMoveData(mName.trim());
        const newMove: TempMove = {
            id: generateId(), name: mName, attr: 'str', skill: 'brawl',
            type: 'Normal', cat: 'Phys', dmgStat: '', power: 0, desc: ''
        };
        if (moveData) {
            newMove.type = String(moveData.Type || "Normal");
            let rawCat = String(moveData.Category || "Physical");
            newMove.cat = rawCat === "Physical" ? "Phys" : (rawCat === "Special" ? "Spec" : "Supp");
            newMove.power = Number(moveData.Power) || 0;
            newMove.desc = String(moveData.Effect || moveData.Description || "");
            
            const rawDmg = String(moveData.Damage1 === "None" ? "" : (moveData.Damage1 || ""));
            newMove.dmgStat = ATTRIBUTE_MAPPING[rawDmg] || rawDmg;
            
            const accuracyOne = String(moveData.Accuracy1 || "");
            newMove.attr = ATTRIBUTE_MAPPING[accuracyOne] || "str";
            newMove.skill = String(moveData.Accuracy2 || "brawl").toLowerCase();
        }
        return newMove;
    });

    const resolvedMoves = await Promise.all(movePromises);

    return {
        species: speciesName,
        attr: genAttr,
        soc: genSoc,
        skills: genSkill,
        customSkillsList: customSkillsList,
        customSkillMap: customSkillMap,
        moves: resolvedMoves,
        maxMoves: maxMoves
    };
}