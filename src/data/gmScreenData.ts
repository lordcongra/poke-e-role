/**
 * Pokerole 3.0 GM Screen & Cheat Sheet Data
 * Based on the reference compilation by Willowlark
 *
 * This barrel file re-exports all modularized GM datasets:
 * - gmCombatData: Combat flow, difficulty, will points, move resolution, holding back, reactions
 * - gmStatusData: Status conditions, categories, stacking, weather conditions, hazards
 * - gmReferenceData: Cover, healing, rank summary, catching, TP progression, balancing
 * - gmTrainerData: Trainer action economy, initiative, commanding, switching lockout, humans in combat
 * - gmManeuversData: Core typeless rules, clashing restriction, 9 official maneuvers
 * - gmAttributeBenchmarksData: Strength lifting capacity & Dexterity speed charts
 * - gmMoveClarificationsData: Encore, Fling, Powers, Natural Gift, Snatch, Substitute, Narrative moves
 * - gmHomebrewData: PMD creation, bag weight, food, weapons, switcher moves
 * - gmRangersData: Pokémon Rangers supplement
 * - gmCheatItems: Searchable GM_CHEAT_ITEMS dataset & interfaces
 */

export * from './gm/gmCombatData';
export * from './gm/gmStatusData';
export * from './gm/gmReferenceData';
export * from './gm/gmTrainerData';
export * from './gm/gmManeuversData';
export * from './gm/gmAttributeBenchmarksData';
export * from './gm/gmMoveClarificationsData';
export * from './gm/gmHomebrewData';
export * from './gm/gmRangersData';
export * from './gm/gmCheatItems';
