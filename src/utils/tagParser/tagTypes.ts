export interface CombatBonuses {
    stats: Record<string, number>;
    skills: Record<string, number>;
    def: number;
    spd: number;
    init: number;
    dmg: number;
    acc: number;
    chance: number;
    seDmg: number;
    critDmg: number;
    firstHitDmg: number;
    firstHitAcc: number;
    gainTempHp: number;
    tempHpOnHit: number;
    tempHpDmgRatio: string;
    highCritStacks: number;
    stackingHighCritStacks: number;
    ignoreLowAcc: number;
    addLowAcc: number;
    ignorePain: boolean;
    roundHeal: number;
    roundDamage: number;
    roundWillRestore: number;
    roundWillDamage: number;
    loseAction: number;
    noReactions: boolean;
    extraReactions: number;
    accFaceAddsDmg: number;
    accFaceAddsDmgLimit: number;
    itemNames: string[];
    accItemNames: string[];
    dmgItemNames: string[];
    passiveNames: string[];
    accPassiveNames: string[];
    dmgPassiveNames: string[];
    abilityNames: string[];
    accAbilityNames: string[];
    dmgAbilityNames: string[];
    highCritItemNames: string[];
    highCritPassiveNames: string[];
    highCritAbilityNames: string[];
}

export interface TagTriggers {
    general: boolean;
    accuracy: boolean;
    damage: boolean;
}

export interface BoostTrackerSource {
    id: string; // Storage key in trackers.boostLevels
    entityKind: 'passive' | 'item' | 'ability';
    entityId: string;
    entityName: string;
    label: string;
    effect: string;
    maxBoost: number;
    currentLevel: number;
    tagText: string;
}

export interface ParsableEntity {
    kind: 'item' | 'passive' | 'ability' | 'move' | 'form' | 'status';
    id: string;
    name: string;
    desc: string;
    showInRollLog?: boolean;
    boostLevel: number;
    maxBoost: number;
}
