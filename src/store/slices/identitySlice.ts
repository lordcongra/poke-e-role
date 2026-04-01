import type { StateCreator } from 'zustand';
import type { CharacterState, IdentitySlice } from '../storeTypes';
import { saveToOwlbear } from '../../utils/obr';
import OBR from '@owlbear-rodeo/sdk';

const OBR_KEY_MAP: Record<string, string> = {
    showTrackers: 'show-trackers',
    isNPC: 'is-npc',
    rolls: 'rolls',
    gender: 'gender',
    homebrewAccess: 'homebrew-access',
    settingHpBar: 'setting-hp-bar',
    gmHpBar: 'gm-hp-bar',
    settingHpText: 'setting-hp-text',
    gmHpText: 'gm-hp-text',
    settingWillBar: 'setting-will-bar',
    gmWillBar: 'gm-will-bar',
    settingWillText: 'setting-will-text',
    gmWillText: 'gm-will-text',
    settingDefBadge: 'setting-def-badge',
    gmDefBadge: 'gm-def-badge',
    settingEcoBadge: 'setting-eco-badge',
    gmEcoBadge: 'gm-eco-badge',
    colorAct: 'color-act',
    colorEva: 'color-eva',
    colorCla: 'color-cla',
    trackerScale: 'tracker-scale',
    xOffset: 'x-offset',
    yOffset: 'y-offset',
    hpOffsetX: 'hp-offset-x',
    hpOffsetY: 'hp-offset-y',
    willOffsetX: 'will-offset-x',
    willOffsetY: 'will-offset-y',
    defOffsetX: 'def-offset-x',
    defOffsetY: 'def-offset-y',
    actOffsetX: 'act-offset-x',
    actOffsetY: 'act-offset-y',
    evaOffsetX: 'eva-offset-x',
    evaOffsetY: 'eva-offset-y',
    claOffsetX: 'cla-offset-x',
    claOffsetY: 'cla-offset-y'
};

const parseLearnset = (movesObj: unknown): Array<{ Learned: string; Name: string }> => {
    const result: Array<{ Learned: string; Name: string }> = [];
    if (Array.isArray(movesObj)) {
        movesObj.forEach((m: unknown) => {
            if (typeof m === 'string') result.push({ Learned: 'Other', Name: m });
            else if (typeof m === 'object' && m !== null) {
                const mRec = m as Record<string, unknown>;
                const rank = mRec.Learned || mRec.Learn || mRec.Level || mRec.Rank || 'Other';
                const name = mRec.Name || mRec.Move || '';
                if (name) result.push({ Learned: String(rank), Name: String(name) });
            }
        });
    } else if (typeof movesObj === 'object' && movesObj !== null) {
        Object.entries(movesObj).forEach(([rank, mList]) => {
            if (Array.isArray(mList)) {
                mList.forEach((m: unknown) => {
                    let name = '';
                    if (typeof m === 'string') name = m;
                    else if (typeof m === 'object' && m !== null) {
                        const mRec = m as Record<string, unknown>;
                        name = String(mRec.Name || mRec.Move || '');
                    }
                    if (name) result.push({ Learned: rank, Name: name });
                });
            }
        });
    }
    return result;
};

export const createIdentitySlice: StateCreator<CharacterState, [], [], IdentitySlice> = (set) => ({
    tokenId: null,
    role: 'PLAYER',
    identity: {
        nickname: '',
        species: '',
        nature: '',
        rank: 'Starter',
        type1: '',
        type2: '',
        ability: '',
        availableAbilities: [],
        mode: 'Pokémon',
        age: '',
        gender: '',
        ruleset: 'vg-vit-hp',
        pain: 'Enabled',
        rolls: 'Public (Everyone)',
        homebrewAccess: 'Full',
        combat: '',
        social: '',
        hand: '',
        isNPC: false,
        learnset: [],
        isAltForm: false,
        baseFormData: '',
        altFormData: '',
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
        colorAct: '#4890fc',
        colorEva: '#c387fc',
        colorCla: '#dfad43',

        trackerScale: 100,
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
        isPrinting: false
    },

    setTokenData: (tokenId, role) => set({ tokenId, role }),

    setIdentity: (field, value) =>
        set((state) => {
            const obrKey = OBR_KEY_MAP[field as string] || (field as string);

            if (field === 'ruleset' || field === 'pain' || field === 'homebrewAccess') {
                if (OBR.isAvailable) {
                    OBR.room.getMetadata().then((meta) => {
                        const roomMeta =
                            (meta['pokerole-pmd-extension/room-settings'] as Record<string, unknown>) || {};
                        if (field === 'ruleset') roomMeta.ruleset = value;
                        if (field === 'pain') roomMeta.painEnabled = value === 'Enabled';
                        if (field === 'homebrewAccess') roomMeta.homebrewAccess = value;
                        OBR.room.setMetadata({ 'pokerole-pmd-extension/room-settings': roomMeta });
                    });
                }
            }

            const updatesToSave: Record<string, unknown> = {};
            if (field !== 'printConfig' && field !== 'tokenImageUrl' && field !== 'isPrinting') {
                if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
                    updatesToSave[obrKey] = value;
                }

                try {
                    if (Object.keys(updatesToSave).length > 0) saveToOwlbear(updatesToSave);
                } catch (error) {
                    console.error(error);
                }
            }

            return { identity: { ...state.identity, [field]: value } };
        }),

    setPrintConfig: (config) =>
        set((state) => ({
            identity: {
                ...state.identity,
                printConfig: { ...state.identity.printConfig, ...config }
            }
        })),

    applyLearnset: (data) =>
        set(
            (state) => ({
                identity: { ...state.identity, learnset: parseLearnset(data.Moves) }
            }),
            false
        )
});
