import type { StateCreator } from 'zustand';
import type { CharacterState, IdentitySlice } from '../storeTypes';
import { parseLearnset } from '../../utils/common/macroHelpers';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';
import {
    loadInitialRoomAndSceneSettings,
    ROOM_SETTINGS_KEYS
} from './roomSettingsSlice';
import { EXCLUDED_FROM_TOKEN_SAVE, OBR_KEY_MAP } from './identityConstants';
import {
    handleInitiativeTrackerSetting,
    updateAbilityData,
    updateSpeciesAndNameData,
    syncAbilityAndTargetState,
    updateRankAndRuleset,
    saveIdentityToOwlbear,
    syncPcStorage
} from './identityUpdaters';

export { ROOM_SETTINGS_KEYS };

const {
    initialInitSettings,
    initialRoomDefaultScale,
    initialRoomDefaultOffsetX,
    initialRoomDefaultOffsetY,
    initialSceneDefaultScale,
    initialSceneDefaultOffsetX,
    initialSceneDefaultOffsetY
} = loadInitialRoomAndSceneSettings();

export const createIdentitySlice: StateCreator<
    CharacterState,
    [['zustand/devtools', never]],
    [],
    IdentitySlice
> = (set) => ({
    tokenId: null,
    role: isStandaloneMode ? 'GM' : 'PLAYER',
    identity: {
        entityId: '',
        nickname: '',
        species: '',
        nature: '',
        rank: 'Starter',
        type1: '',
        type2: '',
        ability: '',
        abilityActive: true,
        abilityBoostActive: false,
        abilityBoostLevel: 0,
        abilityChoiceIndex: 0,
        abilityTags: '',
        availableAbilities: [],
        previousNativeAbility: '',
        mode: 'Pokémon',
        age: '',
        gender: '',
        ruleset: 'vg-vit-hp',
        pain: 'Enabled',
        diceEngine: 'car',
        rolls: 'Public (Everyone)',
        homebrewAccess: 'Full',
        combat: '',
        social: '',
        hand: '',
        isNPC: false,
        learnset: [],
        pokemonBackup: '',
        trainerBackup: '',

        activeTransformation: 'None',
        activeFormId: '',
        formSaves: {},
        customFormConfig: {},
        customFormImages: {},

        baseFormData: '',
        altFormData: '',
        maxFormData: '',
        terastallizeAffinity: '',
        terastallizeBonusActive: false,
        customFormFirstHitAccActive: false,
        customFormFirstHitDmgActive: false,

        megaImageUrl: '',
        maxImageUrl: '',
        teraImageUrl: '',

        badges: [],

        showTrackers: true,
        settingHpBar: true,
        gmHpBar: false,
        settingHpText: true,
        gmHpText: false,
        settingWillBar: true,
        gmWillBar: false,
        settingWillText: true,
        gmWillText: false,
        settingDefBadge: true,
        gmDefBadge: false,
        settingEcoBadge: true,
        gmEcoBadge: false,

        gmOnlyLootGen: true,
        gmOnlyGenerators: true,
        gmOnlyMatchups: false,
        gmOnlyDamageOverride: false,
        gmOnlyTrackers: false,
        gmOnlyAttributeLock: true,
        gmOnlyPullEnemies: true,
        defaultNpcInitiativeHidden: (() => {
            try {
                return typeof localStorage !== 'undefined'
                    ? localStorage.getItem('pkr_room_default_npc_init_hidden') === 'false'
                        ? false
                        : true
                    : true;
            } catch {
                return true;
            }
        })(),
        pmdSkills: typeof localStorage !== 'undefined' ? localStorage.getItem('pkr_room_pmd_skills') !== 'false' : true,
        coreLocked: true,
        socialLocked: true,
        hpLocked: true,
        willLocked: true,
        gmDemoMode: false,
        activeRoomCampaignName: undefined,
        activeRoomCampaignId: undefined,
        roomHideHpBar: false,
        roomHideHpText: false,
        roomHideWillBar: false,
        roomHideWillText: false,
        roomHideDef: false,
        roomHideActions: false,
        roomHideEvade: false,
        roomHideClash: false,
        roomHideHudPlayersOnly: false,
        roomHideHudEnemiesOnly: false,
        roomTrackersRequireInitiative: false,
        isInitiativeActive: false,
        ignoreRoomHudRules: false,

        // Apply Local Settings
        initiativeTrackerPreset: initialInitSettings.preset,
        initiativeTrackerOffsetX: Number(initialInitSettings.offsetX) || 0,
        initiativeTrackerOffsetY: Number(initialInitSettings.offsetY) || 0,
        initiativeTrackerLayout: (initialInitSettings.layout as 'vertical' | 'horizontal') || 'vertical',
        initiativeTrackerAvatarShape: (initialInitSettings.shape as 'circle' | 'square' | 'none') || 'none',
        initiativeTrackerMaxWidth: Number(initialInitSettings.mw) || 0,
        initiativeTrackerMaxHeight: Number(initialInitSettings.mh) || 0,

        colorAct: '#4890fc',
        colorEva: '#c387fc',
        colorCla: '#dfad43',

        trackerScale: 100,
        trackerLayer: 'ATTACHMENT',
        roomDefaultScale: initialRoomDefaultScale,
        roomDefaultOffsetX: initialRoomDefaultOffsetX,
        roomDefaultOffsetY: initialRoomDefaultOffsetY,
        sceneDefaultScale: initialSceneDefaultScale,
        sceneDefaultOffsetX: initialSceneDefaultOffsetX,
        sceneDefaultOffsetY: initialSceneDefaultOffsetY,
        xOffset: 0,
        yOffset: 0,
        hpOffsetX: 0,
        hpOffsetY: 0,
        willOffsetX: 0,
        willOffsetY: 0,
        defOffsetX: 0,
        defOffsetY: 0,
        actOffsetX: 0,
        actOffsetY: 0,
        evaOffsetX: 0,
        evaOffsetY: 0,
        claOffsetX: 0,
        claOffsetY: 0,

        themePrimaryOverride: '',
        themeSecondaryOverride: '',

        tokenImageUrl: null,
        printConfig: {
            blankName: false,
            blankSpecies: false,
            blankType: false,
            blankNature: false,
            blankRank: false,
            blankAgeGender: false,
            blankStats: false,
            blankSocials: false,
            blankSkills: false,
            blankAbilities: false,
            blankMoves: false,
            blankItems: false,
            blankPassives: false,
            hidePortrait: false,
            hideCoreStats: false,
            hideSocialStats: false,
            hideCombatVitals: false,
            hideSkills: false,
            hideAbilities: false,
            hideMoves: false,
            hideItems: false,
            hidePassives: false,
            hideNotes: false,
            autoHideEmptySections: false,
            hideMoveDesc: false,
            hideKnowledgeSkills: false,
            hideCustomSkills: false,
            hideAge: false,
            coreSkillsOnly: false,
            showOnlyActiveAbility: false,
            compactMode: false,
            statStyle: 'dots',
            abilityDescStyle: 'all'
        },
        isPrinting: false,
        pendingDemoRoll: null,

        dexId: '',
        dexCategory: '',
        height: '',
        weight: '',
        dexDescription: '',
        pokedex: {}
    },

    setTokenData: (tokenId, role) =>
        set({ tokenId, role: isStandaloneMode ? 'GM' : role }, false, 'identity/setTokenData'),

    setPendingDemoRoll: (rollData) =>
        set(
            (state) => ({
                identity: { ...state.identity, pendingDemoRoll: rollData }
            }),
            false,
            'identity/setPendingDemoRoll'
        ),

    setIdentity: (field, value) =>
        set(
            (state) => {
                const initIdentity = handleInitiativeTrackerSetting(String(field), value, state.identity);
                if (initIdentity) {
                    return { identity: initIdentity };
                }

                if (field === 'abilityTargetIds') {
                    const prevTargets = state.identity.abilityTargetIds;
                    const nextTargets = Array.isArray(value) ? (value as string[]) : undefined;
                    if (
                        prevTargets === nextTargets ||
                        (Array.isArray(prevTargets) &&
                            Array.isArray(nextTargets) &&
                            prevTargets.length === nextTargets.length &&
                            prevTargets.every((id, idx) => id === nextTargets[idx]))
                    ) {
                        return state;
                    }
                } else if (state.identity[field] === value) {
                    return state;
                }

                const obrKey = OBR_KEY_MAP[field as string] || (field as string);
                const newIdentity = { ...state.identity, [field]: value };
                const updatesToSave: Record<string, unknown> = {};
                const newHealth = { ...state.health };
                const newWill = { ...state.will };

                if (field === 'ability') {
                    updateAbilityData(value, state.identity, newIdentity, state.roomCustomAbilities, updatesToSave);
                }

                updateSpeciesAndNameData(String(field), newIdentity, state.tokenId, state.identity.entityId);

                syncAbilityAndTargetState(String(field), value, newIdentity, state, updatesToSave);

                updateRankAndRuleset(String(field), value, state, newIdentity, newHealth, newWill, updatesToSave);

                saveIdentityToOwlbear(String(field), value, obrKey, EXCLUDED_FROM_TOKEN_SAVE, updatesToSave);

                const nextPcData = syncPcStorage(String(field), value, state, updatesToSave);

                return { identity: newIdentity, health: newHealth, will: newWill, pcData: nextPcData };
            },
            false,
            'identity/setIdentity'
        ),

    setPrintConfig: (config) =>
        set(
            (state) => ({
                identity: {
                    ...state.identity,
                    printConfig: { ...state.identity.printConfig, ...config }
                }
            }),
            false,
            'identity/setPrintConfig'
        ),

    applyLearnset: (data) =>
        set(
            (state) => ({
                identity: { ...state.identity, learnset: parseLearnset(data.Moves) }
            }),
            false,
            'identity/applyLearnset'
        )
});
