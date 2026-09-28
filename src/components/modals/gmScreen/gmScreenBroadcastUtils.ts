import { broadcastInfo } from '../../../utils/diceRoller';
import type {
    StatusEffectData,
    HoldingBackOption,
    ReactionRuleExample,
    PmdBagCapacity,
    PmdItemWeight,
    PmdFoodItem,
    PmdWeaponModel,
    PmdSwitcherModel,
    RangerDispositionRank,
    RangerStyle,
    RangerStyler,
    RangerDangerousBuff,
    RangerManeuver,
    RangerFieldAssist,
    RangerPartnerBondLevel,
    WEATHER_CONDITIONS_DATA,
    ENVIRONMENTAL_HAZARDS_DATA,
    WILL_SPENDING,
    TRAINER_ACTIONS_TABLE,
    COVER_TABLE,
    HEALING_TABLE,
    COMBAT_FLOW_STEPS,
    PMD_CHARACTER_RULES,
    GmCheatItem
} from '../../../data/gmScreenData';

export const broadcastGmCheatItem = (item: GmCheatItem) => {
    broadcastInfo(`GM Screen: ${item.title}`, item.broadcastText);
};

export const broadcastStatus = (s: StatusEffectData) => {
    const text = `Status: ${s.name} [${s.badge} | Category: ${s.categoryType}]\n• Effect: ${s.effect}\n• Resist / Cure: ${s.resist}\n• Duration: ${s.duration}`;
    broadcastInfo(`Status: ${s.name}`, text);
};

export const broadcastWeather = (w: (typeof WEATHER_CONDITIONS_DATA)[0]) => {
    const text = `Weather: ${w.name} [${w.badge}]\n${w.effects.map((e) => `• ${e}`).join('\n')}`;
    broadcastInfo(`Weather: ${w.name}`, text);
};

export const broadcastHazard = (h: (typeof ENVIRONMENTAL_HAZARDS_DATA)[0]) => {
    const text = `Hazard: ${h.name}\n• Effect: ${h.effect}`;
    broadcastInfo(`Hazard: ${h.name}`, text);
};

export const broadcastHoldingBack = (opt: HoldingBackOption) => {
    const text = `Holding Back an Attack: ${opt.title}\n• ${opt.desc}`;
    broadcastInfo(`Holding Back: ${opt.title}`, text);
};

export const broadcastStatusRules = () => {
    const text = `Status Ailments & Conditions Categories:\n• Aggravating: Worsens over time if untreated.\n• Fixed: Constant effect; needs treatment/items to heal.\n• Volatile: Temporary; heals naturally or on switch.\n• Burn & Poison: Deals damage upon infliction and again at the end of the round.\n• Stacking: Conditions can stack! Re-inflicting burn/poison bumps degree. Only Full Heal/Restore & Lum Berry cure multiple conditions at once.`;
    broadcastInfo(`Status Rules & Categories`, text);
};

export const broadcastWill = (w: (typeof WILL_SPENDING)[0]) => {
    const text = `Will Spending: ${w.name} (${w.cost})\n• ${w.effect}`;
    broadcastInfo(`Will: ${w.name}`, text);
};

export const broadcastTrainerAction = (t: (typeof TRAINER_ACTIONS_TABLE)[0]) => {
    const text = `Trainer Action: ${t.action}\n• In Trainer Area: ${t.trainerArea}\n• In the Fray: ${t.inFray}`;
    broadcastInfo(`Trainer Action: ${t.action}`, text);
};

export const broadcastCover = (c: (typeof COVER_TABLE)[0]) => {
    const text = `Cover: ${c.coverage}\n• Bonus Def/Sp.Def: ${c.defBonus}\n• Takes Added Effects: ${c.addedEffects}`;
    broadcastInfo(`Cover: ${c.coverage}`, text);
};

export const broadcastHealing = (h: (typeof HEALING_TABLE)[0]) => {
    const text = `Damage Healing: ${h.damageType}\n• Natural (Rest): ${h.natural}\n• Potion Units: ${h.potion}`;
    broadcastInfo(`Healing: ${h.damageType}`, text);
};

export const broadcastCombatFlowStep = (s: (typeof COMBAT_FLOW_STEPS)[0]) => {
    const text = `Combat Flow Step ${s.step}: ${s.title}\n${s.items.map((it) => `• ${it}`).join('\n')}`;
    broadcastInfo(`Combat Step ${s.step}: ${s.title}`, text);
};

export const broadcastReactionExample = (ex: ReactionRuleExample) => {
    const text = `Reaction Resolution (${ex.title}):\n• Scenario: ${ex.scenario}\n• Resolution Order:\n${ex.orderSteps.map((s) => `  ${s}`).join('\n')}\n• Note: ${ex.explanation}`;
    broadcastInfo(`Reactions: ${ex.title}`, text);
};

export const broadcastReactionCoreRules = () => {
    const text = `Reactions & Late Reactions Core Rules:\n• Action Economy Cost: Rolling any Reaction or Late Reaction consumes 1 of your character’s Actions for the Round, bound to the Multiple Action Difficulty chart.\n• 1 Reaction Per Turn Limit: You can only use ONE reaction per turn.\n• Preemption & Lockout: If a higher reaction number is declared (e.g. ↑2 Extreme Speed), you cannot respond with a lower reaction number.\n• Cannot React to a Late Reaction: Standard Reactions (↑) CANNOT be used against a Late Reaction (↓).\n• Can Late React to a Reaction: You CAN use a Late Reaction (↓) to answer a standard Reaction (↑).\n• No Reaction Without a Reason: You cannot react unless you are being directly targeted by an incoming action (Defensive support moves like Wide Guard / Cover an Ally can protect teammates).`;
    broadcastInfo(`Reaction Rules & Timing`, text);
};

export const broadcastCharacterRule = (r: (typeof PMD_CHARACTER_RULES)[0]) => {
    const text = `PMD Rule: ${r.title} [${r.badge}]\n• Summary: ${r.summary}\n• Detail: ${r.detail}\n• App Tip: ${r.appTip}`;
    broadcastInfo(`PMD Rule: ${r.title}`, text);
};

export const broadcastTreasureBagCapacity = (c: PmdBagCapacity) => {
    const text = `Treasure Bag Capacity (${c.rank} Rank): ${c.capacity} Weight\n• Notes: ${c.notes}`;
    broadcastInfo(`Treasure Bag: ${c.rank} Rank`, text);
};

export const broadcastItemWeight = (w: PmdItemWeight) => {
    const text = `Item Weight: ${w.category} (${w.weight} Wt | ${w.stackRate})\n• Examples: ${w.examples}\n• Usage: ${w.description}`;
    broadcastInfo(`Item Weight: ${w.category}`, text);
};

export const broadcastFoodItem = (f: PmdFoodItem) => {
    const text = `PMD Food: ${f.name} [${f.category} | ${f.rarity}]\n• Will Restored: ${f.willRestore}\n• Effects: ${f.effect}`;
    broadcastInfo(`PMD Food: ${f.name}`, text);
};

export const broadcastWeaponModel = (w: PmdWeaponModel) => {
    const linkText = w.link ? `\n• Reference Doc: ${w.link}` : '';
    const text = `PMD Weapon Model: ${w.name} (${w.creator})\n• Type: ${w.type} (${w.weight} Wt)\n• Rules: ${w.description}\n• Example: ${w.example}${linkText}`;
    broadcastInfo(`PMD Weapon: ${w.name}`, text);
};

export const broadcastSwitcherModel = (s: PmdSwitcherModel) => {
    const text = `PMD Switcher Model: ${s.name} (${s.creator})\n• Style: ${s.style}\n• Rules: ${s.description}\n• Example: ${s.example}`;
    broadcastInfo(`PMD Switcher: ${s.name}`, text);
};

export const broadcastDispositionRank = (r: RangerDispositionRank) => {
    const text = `Ranger Rank: ${r.rank}\n• Disposition Bonus: +${r.bonus} (DM = Will + ${r.bonus})\n• Maneuver Slots: ${r.maneuversCount}\n• Max Wild Assists: ${r.assistsCount}`;
    broadcastInfo(`Ranger Rank: ${r.rank}`, text);
};

export const broadcastRangerStyle = (s: RangerStyle) => {
    const text = `Ranger Style: ${s.name} [Associated Stat: ${s.stat}]\n• Description: ${s.description}`;
    broadcastInfo(`Ranger Style: ${s.name}`, text);
};

export const broadcastStyler = (st: RangerStyler) => {
    const text = `Capture Styler: ${st.name} [Charge: ${st.charge} HP | Cost: ${st.cost === '—' ? 'Issued' : `${st.cost} P$`}]\n• Effect: ${st.effect}\n• Note: ${st.flavor}`;
    broadcastInfo(`Capture Styler: ${st.name}`, text);
};

export const broadcastDangerousBuff = (b: RangerDangerousBuff) => {
    const text = `Dangerous Encounter Buff: ${b.name}\n• Effect: ${b.effect}`;
    broadcastInfo(`Boss Buff: ${b.name}`, text);
};

export const broadcastManeuver = (m: RangerManeuver) => {
    const text = `Ranger Maneuver: ${m.name} [Category: ${m.category}]\n• Accuracy: ${m.accuracy} | Power: ${m.power}\n• Description: ${m.description}${m.flavor ? `\n• Flavor: ${m.flavor}` : ''}`;
    broadcastInfo(`Maneuver: ${m.name}`, text);
};

export const broadcastFieldAssist = (a: RangerFieldAssist) => {
    const text = `Field Assist: ${a.name}\n• Effect: ${a.effect}`;
    broadcastInfo(`Field Assist: ${a.name}`, text);
};

export const broadcastPartnerBond = (b: RangerPartnerBondLevel) => {
    const text = `Partner Bond Level ${b.level} [Requirement: ${b.requirement}]\n• Ability (1x per Scene): ${b.ability}`;
    broadcastInfo(`Partner Bond Lv ${b.level}`, text);
};
