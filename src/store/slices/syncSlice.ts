// src/store/slices/syncSlice.ts
import type { StateCreator } from 'zustand';
import type { CharacterState, SyncSlice, MoveData, SkillCheck, ExtraCategory, Rank, InventoryItem, StatusItem, EffectItem, CustomInfo } from '../storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';

export const createSyncSlice: StateCreator<CharacterState, [], [], SyncSlice> = (set) => ({
    loadFromOwlbear: (meta) => set((state) => {
        const newStats = { ...state.stats };
        Object.values(CombatStat).forEach(stat => {
            newStats[stat].base = meta[`${stat}-base`] !== undefined ? Number(meta[`${stat}-base`]) : (stat === 'ins' ? 1 : 2);
            newStats[stat].rank = meta[`${stat}-rank`] !== undefined ? Number(meta[`${stat}-rank`]) : 0;
            newStats[stat].buff = meta[`${stat}-buff`] !== undefined ? Number(meta[`${stat}-buff`]) : 0;
            newStats[stat].debuff = meta[`${stat}-debuff`] !== undefined ? Number(meta[`${stat}-debuff`]) : 0;
            const limitVal = meta[`${stat}-limit`] ?? meta[`${stat}-max`];
            newStats[stat].limit = limitVal !== undefined ? Number(limitVal) : 5; 
        });
        
        const newSocials = { ...state.socials };
        Object.values(SocialStat).forEach(stat => {
            newSocials[stat].base = meta[`${stat}-base`] !== undefined ? Number(meta[`${stat}-base`]) : 1;
            newSocials[stat].rank = meta[`${stat}-rank`] !== undefined ? Number(meta[`${stat}-rank`]) : 0;
            newSocials[stat].buff = meta[`${stat}-buff`] !== undefined ? Number(meta[`${stat}-buff`]) : 0;
            newSocials[stat].debuff = meta[`${stat}-debuff`] !== undefined ? Number(meta[`${stat}-debuff`]) : 0;
            const limitVal = meta[`${stat}-limit`] ?? meta[`${stat}-max`];
            newSocials[stat].limit = limitVal !== undefined ? Number(limitVal) : 5;
        });

        const newSkills = { ...state.skills };
        Object.values(Skill).forEach(skill => {
            newSkills[skill].base = meta[`${skill}-base`] !== undefined ? Number(meta[`${skill}-base`]) : 0;
            newSkills[skill].buff = meta[`${skill}-buff`] !== undefined ? Number(meta[`${skill}-buff`]) : 0;
            newSkills[skill].customName = meta[`label-${skill}`] !== undefined ? String(meta[`label-${skill}`]) : '';
        });

        let parsedMoves: MoveData[] = [];
        try { parsedMoves = meta['moves-data'] ? JSON.parse(String(meta['moves-data'])) : []; } catch(e) {}
        
        let parsedChecks: SkillCheck[] = [];
        try { parsedChecks = meta['skill-checks-data'] ? JSON.parse(String(meta['skill-checks-data'])) : []; } catch(e) {}
        
        let parsedExtraCats: ExtraCategory[] = [];
        try { parsedExtraCats = meta['extra-skills-data'] ? JSON.parse(String(meta['extra-skills-data'])) : []; } catch(e) {}

        let parsedInv: InventoryItem[] = [];
        try { parsedInv = meta['inv-data'] ? JSON.parse(String(meta['inv-data'])) : []; } catch(e) {}

        let parsedStatuses: StatusItem[] = [];
        try { 
            parsedStatuses = meta['status-list'] ? JSON.parse(String(meta['status-list'])) : [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }]; 
            if (parsedStatuses.length === 0) parsedStatuses.push({ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 });
        } catch(e) {
            parsedStatuses = [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }];
        }

        let parsedEffects: EffectItem[] = [];
        try { parsedEffects = meta['effect-list'] ? JSON.parse(String(meta['effect-list'])) : []; } catch(e) {}

        let parsedCustomInfo: CustomInfo[] = [];
        try { parsedCustomInfo = meta['custom-info-data'] ? JSON.parse(String(meta['custom-info-data'])) : []; } catch(e) {}

        const newHealth = {
            hpCurr: meta['hp-curr'] !== undefined ? Number(meta['hp-curr']) : 5,
            hpMax: meta['hp-max-display'] !== undefined ? Number(meta['hp-max-display']) : 5,
            hpBase: meta['hp-base'] !== undefined ? Number(meta['hp-base']) : 4,
        };
        
        const newWill = {
            willCurr: meta['will-curr'] !== undefined ? Number(meta['will-curr']) : 4,
            willMax: meta['will-max-display'] !== undefined ? Number(meta['will-max-display']) : 4,
            willBase: meta['will-base'] !== undefined ? Number(meta['will-base']) : 3,
        };

        const abilityListStr = String(meta['ability-list'] || '');
        const loadedAbilities = abilityListStr ? abilityListStr.split(',') : [];

        return {
            ...state,
            identity: { 
                ...state.identity,
                nickname: String(meta['nickname'] || ''), species: String(meta['species'] || ''),
                nature: String(meta['nature'] || ''), rank: (meta['rank'] as Rank) || 'Starter',
                
                // AUDIT FIX: Checks for both casing patterns from old versions!
                type1: String(meta['type1'] || meta['Type1'] || ''), 
                type2: String(meta['type2'] || meta['Type2'] || ''),
                
                ability: String(meta['ability'] || ''), availableAbilities: loadedAbilities,
                mode: String(meta['mode'] || 'Pokémon'), age: String(meta['age'] || ''), gender: String(meta['gender'] || ''),
                rolls: String(meta['rolls'] || 'Public (Everyone)'),
                combat: String(meta['combat'] || ''), social: String(meta['social'] || ''), hand: String(meta['hand'] || ''),
                isNPC: meta['is-npc'] === true || meta['is-npc'] === 'true',
                pokemonBackup: String(meta['pokemon-backup'] || ''), trainerBackup: String(meta['trainer-backup'] || ''),
                baseFormData: String(meta['base-form-data'] || ''), altFormData: String(meta['alt-form-data'] || ''),
                isAltForm: meta['is-alt-form'] === true || meta['is-alt-form'] === 'true',
                
                showTrackers: meta['show-trackers'] !== false && meta['show-trackers'] !== 'false',
                settingHpBar: meta['setting-hp-bar'] !== false && meta['setting-hp-bar'] !== 'false',
                gmHpBar: meta['gm-hp-bar'] === true || meta['gm-hp-bar'] === 'true',
                settingHpText: meta['setting-hp-text'] !== false && meta['setting-hp-text'] !== 'false',
                gmHpText: meta['gm-hp-text'] === true || meta['gm-hp-text'] === 'true',
                settingWillBar: meta['setting-will-bar'] !== false && meta['setting-will-bar'] !== 'false',
                gmWillBar: meta['gm-will-bar'] === true || meta['gm-will-bar'] === 'true',
                settingWillText: meta['setting-will-text'] !== false && meta['setting-will-text'] !== 'false',
                gmWillText: meta['gm-will-text'] === true || meta['gm-will-text'] === 'true',
                settingDefBadge: meta['setting-def-badge'] !== false && meta['setting-def-badge'] !== 'false',
                gmDefBadge: meta['gm-def-badge'] === true || meta['gm-def-badge'] === 'true',
                settingEcoBadge: meta['setting-eco-badge'] !== false && meta['setting-eco-badge'] !== 'false',
                gmEcoBadge: meta['gm-eco-badge'] === true || meta['gm-eco-badge'] === 'true',
                colorAct: String(meta['color-act'] || '#4890fc'), colorEva: String(meta['color-eva'] || '#c387fc'),
                colorCla: String(meta['color-cla'] || '#dfad43'),
                
                xOffset: Number(meta['x-offset']) || 0,
                yOffset: Number(meta['y-offset']) || 0,
                hpOffsetX: Number(meta['hp-offset-x']) || 0, hpOffsetY: Number(meta['hp-offset-y']) || 0,
                willOffsetX: Number(meta['will-offset-x']) || 0, willOffsetY: Number(meta['will-offset-y']) || 0,
                defOffsetX: Number(meta['def-offset-x']) || 0, defOffsetY: Number(meta['def-offset-y']) || 0,
                actOffsetX: Number(meta['act-offset-x']) || 0, actOffsetY: Number(meta['act-offset-y']) || 0,
                evaOffsetX: Number(meta['eva-offset-x']) || 0, evaOffsetY: Number(meta['eva-offset-y']) || 0,
                claOffsetX: Number(meta['cla-offset-x']) || 0, claOffsetY: Number(meta['cla-offset-y']) || 0
            },
            health: newHealth,
            will: newWill,
            derived: {
                defBuff: Number(meta['def-buff'] ?? meta['defBuff']) || 0, 
                defDebuff: Number(meta['def-debuff'] ?? meta['defDebuff']) || 0,
                sdefBuff: Number(meta['spd-buff'] ?? meta['sdefBuff']) || 0, 
                sdefDebuff: Number(meta['spd-debuff'] ?? meta['sdefDebuff']) || 0,
                happy: Number(meta['happiness-curr'] ?? meta['happy']) || 0, 
                loyal: Number(meta['loyalty-curr'] ?? meta['loyal']) || 0
            },
            extras: { core: Number(meta['extra-core']) || 0, social: Number(meta['extra-social']) || 0, skill: Number(meta['extra-skill']) || 0 },
            trackers: {
                actions: Number(meta['actions-used']) || 0,
                evade: meta['evasions-used'] === true || meta['evasions-used'] === 'true',
                clash: meta['clashes-used'] === true || meta['clashes-used'] === 'true',
                chances: Number(meta['chances-used']) || 0, fate: Number(meta['fate-used']) || 0,
                globalAcc: Number(meta['global-acc-mod']) || 0, globalDmg: Number(meta['global-dmg-mod']) || 0,
                globalSucc: Number(meta['global-succ-mod']) || 0, globalChance: Number(meta['global-chance-mod']) || 0,
                ignoredPain: Number(meta['ignored-pain-mod']) || 0
            },
            notes: String(meta['notes'] || ''),
            tp: Number(meta['training-points']) || 0, currency: Number(meta['currency']) || 0,
            stats: newStats, socials: newSocials, skills: newSkills, moves: parsedMoves, skillChecks: parsedChecks, extraCategories: parsedExtraCats,
            inventory: parsedInv, statuses: parsedStatuses, effects: parsedEffects, customInfo: parsedCustomInfo
        };
    })
});