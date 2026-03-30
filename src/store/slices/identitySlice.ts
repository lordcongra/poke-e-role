// src/store/slices/identitySlice.ts
import type { StateCreator } from 'zustand';
import type { CharacterState, IdentitySlice } from '../storeTypes';
import { saveToOwlbear } from '../../utils/obr';
import OBR from "@owlbear-rodeo/sdk";

const parseLearnset = (movesObj: unknown): Array<{Learned: string, Name: string}> => {
    const result: Array<{Learned: string, Name: string}> = [];
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
    tokenId: null, role: 'PLAYER',
    identity: { 
        nickname: '', species: '', nature: '', rank: 'Starter', 
        type1: '', type2: '', ability: '', availableAbilities: [],
        mode: 'Pokémon', age: '', gender: '', ruleset: 'vg-vit-hp', pain: 'Disabled', rolls: 'Public (Everyone)',
        combat: '', social: '', hand: '', isNPC: false, learnset: [],
        isAltForm: false, baseFormData: '', altFormData: '',
        showTrackers: true, settingHpBar: true, gmHpBar: false, settingHpText: true, gmHpText: false,
        settingWillBar: true, gmWillBar: false, settingWillText: true, gmWillText: false,
        settingDefBadge: true, gmDefBadge: false, settingEcoBadge: true, gmEcoBadge: false,
        colorAct: '#4890fc', colorEva: '#c387fc', colorCla: '#dfad43', 
        
        xOffset: 0, yOffset: 0,
        hpOffsetX: 0, hpOffsetY: 0, willOffsetX: 0, willOffsetY: 0, defOffsetX: 0, defOffsetY: 0,
        actOffsetX: 0, actOffsetY: 0, evaOffsetX: 0, evaOffsetY: 0, claOffsetX: 0, claOffsetY: 0
    },

    setTokenData: (tokenId, role) => set({ tokenId, role }),

    setIdentity: (field, value) => set((state) => {
        let obrKey = field as string;
        if (field === 'showTrackers') obrKey = 'show-trackers'; else if (field === 'isNPC') obrKey = 'is-npc';
        else if (field === 'rolls') obrKey = 'rolls';
        else if (field === 'gender') obrKey = 'gender';
        else if (field === 'settingHpBar') obrKey = 'setting-hp-bar'; else if (field === 'gmHpBar') obrKey = 'gm-hp-bar';
        else if (field === 'settingHpText') obrKey = 'setting-hp-text'; else if (field === 'gmHpText') obrKey = 'gm-hp-text';
        else if (field === 'settingWillBar') obrKey = 'setting-will-bar'; else if (field === 'gmWillBar') obrKey = 'gm-will-bar';
        else if (field === 'settingWillText') obrKey = 'setting-will-text'; else if (field === 'gmWillText') obrKey = 'gm-will-text';
        else if (field === 'settingDefBadge') obrKey = 'setting-def-badge'; else if (field === 'gmDefBadge') obrKey = 'gm-def-badge';
        else if (field === 'settingEcoBadge') obrKey = 'setting-eco-badge'; else if (field === 'gmEcoBadge') obrKey = 'gm-eco-badge';
        else if (field === 'colorAct') obrKey = 'color-act'; else if (field === 'colorEva') obrKey = 'color-eva';
        else if (field === 'colorCla') obrKey = 'color-cla'; 
        else if (field === 'xOffset') obrKey = 'x-offset'; else if (field === 'yOffset') obrKey = 'y-offset';
        else if (field === 'hpOffsetX') obrKey = 'hp-offset-x'; else if (field === 'hpOffsetY') obrKey = 'hp-offset-y';
        else if (field === 'willOffsetX') obrKey = 'will-offset-x'; else if (field === 'willOffsetY') obrKey = 'will-offset-y';
        else if (field === 'defOffsetX') obrKey = 'def-offset-x'; else if (field === 'defOffsetY') obrKey = 'def-offset-y';
        else if (field === 'actOffsetX') obrKey = 'act-offset-x'; else if (field === 'actOffsetY') obrKey = 'act-offset-y';
        else if (field === 'evaOffsetX') obrKey = 'eva-offset-x'; else if (field === 'evaOffsetY') obrKey = 'eva-offset-y';
        else if (field === 'claOffsetX') obrKey = 'cla-offset-x'; else if (field === 'claOffsetY') obrKey = 'cla-offset-y';

        if (field === 'ruleset' || field === 'pain') {
            if (OBR.isAvailable) {
                OBR.room.getMetadata().then(meta => {
                    const roomMeta = (meta["pokerole-pmd-extension/room-settings"] as Record<string, unknown>) || {};
                    if (field === 'ruleset') roomMeta.ruleset = value;
                    if (field === 'pain') roomMeta.painEnabled = value === 'Enabled';
                    OBR.room.setMetadata({ "pokerole-pmd-extension/room-settings": roomMeta });
                });
            }
        }

        const updatesToSave: Record<string, unknown> = {};
        if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
            updatesToSave[obrKey] = value;
        }

        try { if (Object.keys(updatesToSave).length > 0) saveToOwlbear(updatesToSave); } catch (e) {}
        return { identity: { ...state.identity, [field]: value } };
    }),

    applyLearnset: (data) => set((state) => ({
        identity: { ...state.identity, learnset: parseLearnset(data.Moves) }
    }), false),
});