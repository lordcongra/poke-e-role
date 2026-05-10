import type { TempMove, GeneratorConfig } from '../store/storeTypes';

export interface DraftingContext {
    config: GeneratorConfig;
    type1: string;
    type2: string;
    hasType2: boolean;
    myTypes: string[];
    effectiveBias: string;
    draftedAccAttrs: Set<string>;
    draftedSkills: Set<string>;
    typeCounts: Map<string, number>;
}

export function getDefensiveScore(move: TempMove): number {
    let score = 0;
    const text = (move.name + ' ' + move.desc).toLowerCase();
    const keywords = [
        'protect',
        'shield',
        'guard',
        'block',
        'barrier',
        'defense',
        'sp. def',
        'heal',
        'recover',
        'roost',
        'synthesis',
        'light screen',
        'reflect',
        'status',
        'cure',
        'rest'
    ];
    for (const keyword of keywords) {
        if (text.includes(keyword)) score += 1;
    }
    return score;
}

export function getMoveScore(move: TempMove, context: DraftingContext): number {
    const { effectiveBias, myTypes, config, draftedAccAttrs, draftedSkills } = context;
    let score = 0;

    const isFunctionallyPhysical = move.cat === 'Phys' || move.dmgStat === 'str';
    const isFunctionallySpecial = move.cat === 'Spec' || move.dmgStat === 'spe';

    // STAB Match vs Bias Mismatch
    if (effectiveBias === 'physical') {
        if (isFunctionallyPhysical) score += 60;
        else if (move.cat === 'Spec' && !isFunctionallyPhysical) score -= 80;
        // Pre-seed accuracy preference (Including VIT for bruisers)
        if (move.attr === 'str' || move.attr === 'dex' || move.attr === 'vit') score += 20;
    } else if (effectiveBias === 'special') {
        if (isFunctionallySpecial) score += 60;
        else if (move.cat === 'Phys' && !isFunctionallySpecial) score -= 80;
        // Pre-seed accuracy preference
        if (move.attr === 'spe' || move.attr === 'ins' || move.attr === 'will' || move.attr === 'dex') score += 20;
    } else if (effectiveBias === 'tank') {
        if (move.attr === 'vit' || move.attr === 'ins' || move.attr === 'will') score += 20;
        if (move.cat === 'Status') score += 20;
        score += getDefensiveScore(move) * 10;
    } else if (effectiveBias === 'support') {
        if (move.cat === 'Status') score += 60;
        else score -= 20;
        score += getDefensiveScore(move) * 5;
    }

    if (myTypes.includes(move.type)) {
        score += 40;
    } else {
        if (config.coveragePreference === 'heavy') score += 45;
        else if (config.coveragePreference === 'none') score -= 100;
    }

    // Dynamic Synergy Adjustments
    if (draftedAccAttrs.has(move.attr)) score += 15;
    if (move.attr === 'will' && draftedAccAttrs.has('ins')) score += 15;
    if (move.attr === 'ins' && draftedAccAttrs.has('will')) score += 15;

    // For early drafting, evaluating synergy based on the first skill parsed is acceptable
    if (move.skill && draftedSkills.has(move.skill)) score += 10;

    let effectivePower = move.power;
    if (move.cat === 'Status') {
        effectivePower = 3; // Give Status moves intrinsic power value so they don't get buried
    } else if (effectivePower === 0) {
        effectivePower = 3; // Treat Variable attacks as average
    }
    score += effectivePower * 2;

    return score;
}

export function draftInitialMoves(
    config: GeneratorConfig,
    fetchedMoves: TempMove[],
    fetchedOverrankMoves: TempMove[],
    type1: string,
    type2: string,
    hasType2: boolean,
    effectiveBias: string,
    draftedMax: number
) {
    const draftedMoves: TempMove[] = [];
    let leftoverPool: TempMove[] = [];
    const typeCounts = new Map<string, number>();
    const draftedAccAttrs = new Set<string>();
    const draftedSkills = new Set<string>();
    const myTypes = [type1, type2].filter((type) => type && type !== 'None');

    const context: DraftingContext = {
        config,
        type1,
        type2,
        hasType2,
        myTypes,
        effectiveBias,
        draftedAccAttrs,
        draftedSkills,
        typeCounts
    };

    let chosenOverrankMoveName = '';

    // 🌟 EVALUATE OVERRANK POOL 🌟
    if (config.allowOverrank && fetchedOverrankMoves.length > 0) {
        fetchedOverrankMoves.sort((a, b) => {
            const aScore = getMoveScore(a, context) + Math.random() * 5;
            const bScore = getMoveScore(b, context) + Math.random() * 5;
            return bScore - aScore;
        });

        const bestOverrankMove = fetchedOverrankMoves[0];
        bestOverrankMove.marker = '★';
        chosenOverrankMoveName = bestOverrankMove.name;
        fetchedMoves.push(bestOverrankMove);
    }

    if (config.buildType === 'wild') {
        leftoverPool = [...fetchedMoves].sort(() => 0.5 - Math.random());
        while (draftedMoves.length < draftedMax && leftoverPool.length > 0) {
            const move = leftoverPool.shift();
            if (move) draftedMoves.push(move);
        }
    } else {
        let supportPool = fetchedMoves.filter((move) => move.cat === 'Status');
        let attackPool = fetchedMoves.filter((move) => move.cat === 'Phys' || move.cat === 'Spec');

        const getTotalCoverage = () =>
            Array.from(typeCounts.entries())
                .filter(([t]) => t !== type1 && t !== type2)
                .reduce((sum, [, count]) => sum + count, 0);

        let remainingAttackSlots = config.targetAtkCount;
        let remainingSupportSlots = config.targetSupCount;
        const maxStabAllowedTotal = Math.max(1, config.targetAtkCount - 1);

        // INTERCEPT THE SCORED OVERRANK MOVE!
        if (chosenOverrankMoveName) {
            const overrankMoveObj = fetchedMoves.find((m) => m.name === chosenOverrankMoveName);
            if (overrankMoveObj) {
                draftedMoves.push(overrankMoveObj);
                typeCounts.set(overrankMoveObj.type, 1);
                if (overrankMoveObj.attr) draftedAccAttrs.add(overrankMoveObj.attr);
                if (overrankMoveObj.skill) draftedSkills.add(overrankMoveObj.skill);

                if (overrankMoveObj.cat === 'Status') {
                    if (remainingSupportSlots > 0) remainingSupportSlots--;
                } else {
                    if (remainingAttackSlots > 0) remainingAttackSlots--;
                }

                // Safely remove from the available pool so it can't be dual-drafted
                const attackIndex = attackPool.findIndex((m) => m.name === chosenOverrankMoveName);
                if (attackIndex !== -1) attackPool.splice(attackIndex, 1);
                const supportIndex = supportPool.findIndex((m) => m.name === chosenOverrankMoveName);
                if (supportIndex !== -1) supportPool.splice(supportIndex, 1);
            }
        }

        // 1. DRAFT ATTACK POOL FIRST to establish the offensive skill/attribute footprint
        while (remainingAttackSlots > 0 && attackPool.length > 0 && draftedMoves.length < draftedMax) {
            attackPool.sort((a, b) => {
                const aScore = getMoveScore(a, context) + Math.random() * 5;
                const bScore = getMoveScore(b, context) + Math.random() * 5;
                return bScore - aScore;
            });

            let draftedIndex = -1;

            for (let i = 0; i < attackPool.length; i++) {
                const move = attackPool[i];
                const currentCount = typeCounts.get(move.type) || 0;

                const isPrimary = type1 && move.type === type1;
                const isSecondary = hasType2 && move.type === type2;

                let totalStabDrafted = Array.from(typeCounts.entries())
                    .filter(([t]) => t === type1 || t === type2)
                    .reduce((sum, [, count]) => sum + count, 0);

                let canDraft = false;

                if (isPrimary) {
                    if (config.overridePrimaryStab) {
                        if (currentCount < config.primaryStabCount) canDraft = true;
                    } else {
                        if (currentCount < 2 && totalStabDrafted < maxStabAllowedTotal) canDraft = true;
                    }
                } else if (isSecondary) {
                    if (config.overrideSecondaryStab) {
                        if (currentCount < config.secondaryStabCount) canDraft = true;
                    } else {
                        if (currentCount < 2 && totalStabDrafted < maxStabAllowedTotal) canDraft = true;
                    }
                } else {
                    if (config.coveragePreference === 'fixed') {
                        if (getTotalCoverage() < config.coverageCount && currentCount < 1) canDraft = true;
                    } else if (config.coveragePreference === 'none') {
                        canDraft = false;
                    } else {
                        if (currentCount < 1) canDraft = true;
                    }
                }

                if (canDraft) {
                    draftedMoves.push(move);
                    typeCounts.set(move.type, currentCount + 1);
                    if (move.attr) draftedAccAttrs.add(move.attr);
                    if (move.skill) draftedSkills.add(move.skill);

                    draftedIndex = i;
                    remainingAttackSlots--;
                    break;
                }
            }

            if (draftedIndex !== -1) {
                attackPool.splice(draftedIndex, 1);
            } else {
                break; // No legal moves left in attack pool
            }
        }

        // 2. DRAFT SUPPORT POOL SECOND (Now that we have a footprint, they will draft synergistically)
        supportPool.sort((a, b) => {
            let aScore = getMoveScore(a, context) + Math.random() * 5;
            let bScore = getMoveScore(b, context) + Math.random() * 5;
            return bScore - aScore;
        });

        for (let i = 0; i < remainingSupportSlots && supportPool.length > 0 && draftedMoves.length < draftedMax; i++) {
            const move = supportPool.shift();
            if (move) {
                draftedMoves.push(move);
                if (move.attr) draftedAccAttrs.add(move.attr);
                if (move.skill) draftedSkills.add(move.skill);
            }
        }

        leftoverPool = fetchedMoves.filter((move) => !draftedMoves.includes(move));
    }

    return { draftedMoves, leftoverPool, context };
}

export function draftSpilloverMoves(
    draftedMoves: TempMove[],
    leftoverPool: TempMove[],
    finalDraftedMax: number,
    context: DraftingContext
) {
    const { config } = context;

    // 🌟 SPILLOVER RATIO LOGIC 🌟
    if (
        config.useSpilloverRatio &&
        config.buildType !== 'wild' &&
        draftedMoves.length < finalDraftedMax &&
        leftoverPool.length > 0
    ) {
        leftoverPool.sort((a, b) => {
            const aScore = getMoveScore(a, context) + Math.random() * 5;
            const bScore = getMoveScore(b, context) + Math.random() * 5;
            return bScore - aScore;
        });

        const leftoverAtk = leftoverPool.filter((m) => m.cat !== 'Status');
        const leftoverSup = leftoverPool.filter((m) => m.cat === 'Status');

        let extraAtkDrafted = 0;
        let extraSupDrafted = 0;

        while (draftedMoves.length < finalDraftedMax && (leftoverAtk.length > 0 || leftoverSup.length > 0)) {
            let wantAtk = true;

            if (config.spilloverSupRatio > 0) {
                if (config.spilloverAtkRatio === 0) {
                    wantAtk = false;
                } else {
                    const expectedAtk = (extraSupDrafted * config.spilloverAtkRatio) / config.spilloverSupRatio;
                    wantAtk = extraAtkDrafted <= expectedAtk;
                }
            }

            if (config.spilloverJitter && Math.random() < 0.25) {
                wantAtk = !wantAtk;
            }

            let moveToAdd;
            if (wantAtk) {
                moveToAdd = leftoverAtk.length > 0 ? leftoverAtk.shift() : leftoverSup.shift();
                if (moveToAdd && moveToAdd.cat !== 'Status') extraAtkDrafted++;
                else extraSupDrafted++;
            } else {
                moveToAdd = leftoverSup.length > 0 ? leftoverSup.shift() : leftoverAtk.shift();
                if (moveToAdd && moveToAdd.cat === 'Status') extraSupDrafted++;
                else extraAtkDrafted++;
            }

            if (moveToAdd) {
                draftedMoves.push(moveToAdd);
            }
        }
    } else if (config.buildType !== 'wild') {
        while (draftedMoves.length < finalDraftedMax && leftoverPool.length > 0) {
            leftoverPool.sort((a, b) => {
                const aScore = getMoveScore(a, context) + Math.random() * 5;
                const bScore = getMoveScore(b, context) + Math.random() * 5;
                return bScore - aScore;
            });
            const move = leftoverPool.shift();
            if (move) {
                draftedMoves.push(move);
            }
        }
    } else if (config.buildType === 'wild') {
        while (draftedMoves.length < finalDraftedMax && leftoverPool.length > 0) {
            const move = leftoverPool.shift();
            if (move) draftedMoves.push(move);
        }
    }
}

export function sortDraftedMoves(draftedMoves: TempMove[], type1: string, hasType2: boolean, type2: string) {
    draftedMoves.sort((a, b) => {
        const getTypePriority = (type: string) => {
            if (type === type1) return 1;
            if (hasType2 && type === type2) return 2;
            return 3;
        };

        const priorityA = getTypePriority(a.type);
        const priorityB = getTypePriority(b.type);

        if (priorityA !== priorityB) return priorityA - priorityB;
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        if (a.cat === 'Status' && b.cat !== 'Status') return 1;
        if (a.cat !== 'Status' && b.cat === 'Status') return -1;

        return b.power - a.power;
    });
}
