import type { CharacterState } from '../store/storeTypes';

export function flattenStateToMetadata(state: CharacterState): Record<string, string | number | boolean> {
    const flatMetadata: Record<string, string | number | boolean> = {};

    try {
        const sanitizeBackup = (backupString: string | undefined, key: string) => {
            if (!backupString) return;
            try {
                const parsed = JSON.parse(backupString);
                if (parsed.identity || parsed.health || parsed.backupFormData) {
                    console.warn(`Blocked bloated legacy data for ${key} during import to protect token.`);
                } else {
                    flatMetadata[key] = backupString;
                }
            } catch (e) {
                flatMetadata[key] = backupString;
            }
        };

        if (state.identity) {
            if (state.identity.nickname !== undefined) flatMetadata['name'] = state.identity.nickname;
            if (state.identity.species !== undefined) flatMetadata['species'] = state.identity.species;
            if (state.identity.nature !== undefined) flatMetadata['nature'] = state.identity.nature;
            if (state.identity.ability !== undefined) flatMetadata['ability'] = state.identity.ability;
            if (state.identity.type1 !== undefined) flatMetadata['type1'] = state.identity.type1;
            if (state.identity.type2 !== undefined) flatMetadata['type2'] = state.identity.type2;
            if (state.identity.mode !== undefined) flatMetadata['mode'] = state.identity.mode;

            if (state.identity.activeTransformation !== undefined)
                flatMetadata['active-transformation'] = state.identity.activeTransformation;
            if (state.identity.activeFormId !== undefined) flatMetadata['active-form-id'] = state.identity.activeFormId;
            if (state.identity.formSaves !== undefined)
                flatMetadata['form-saves'] = JSON.stringify(state.identity.formSaves);
            if (state.identity.customFormConfig !== undefined)
                flatMetadata['custom-form-config'] = JSON.stringify(state.identity.customFormConfig);
            if (state.identity.badges !== undefined)
                flatMetadata['badges-data'] = JSON.stringify(state.identity.badges);

            if (state.identity.terastallizeAffinity !== undefined)
                flatMetadata['terastallize-affinity'] = state.identity.terastallizeAffinity;
            if (state.identity.terastallizeBonusActive !== undefined)
                flatMetadata['terastallize-bonus-active'] = state.identity.terastallizeBonusActive;

            if (state.identity.customFormFirstHitAccActive !== undefined)
                flatMetadata['custom-form-first-hit-acc'] = state.identity.customFormFirstHitAccActive;
            if (state.identity.customFormFirstHitDmgActive !== undefined)
                flatMetadata['custom-form-first-hit-dmg'] = state.identity.customFormFirstHitDmgActive;

            sanitizeBackup(state.identity.baseFormData, 'base-form-data');
            sanitizeBackup(state.identity.altFormData, 'alt-form-data');
            sanitizeBackup(state.identity.maxFormData, 'max-form-data');
            sanitizeBackup(state.identity.pokemonBackup, 'pokemon-backup');
            sanitizeBackup(state.identity.trainerBackup, 'trainer-backup');
        }

        if (state.health) {
            if (state.health.hpCurr !== undefined) flatMetadata['hp-curr'] = state.health.hpCurr;
            if (state.health.hpMax !== undefined) flatMetadata['hp-max-display'] = state.health.hpMax;
            if (state.health.hpBase !== undefined) flatMetadata['hp-base'] = state.health.hpBase;
            if (state.health.temporaryHitPoints !== undefined)
                flatMetadata['temporary-hit-points'] = state.health.temporaryHitPoints;
            if (state.health.temporaryHitPointsMax !== undefined)
                flatMetadata['temporary-hit-points-max'] = state.health.temporaryHitPointsMax;
        }

        if (state.will) {
            if (state.will.willCurr !== undefined) flatMetadata['will-curr'] = state.will.willCurr;
            if (state.will.willMax !== undefined) flatMetadata['will-max-display'] = state.will.willMax;
            if (state.will.willBase !== undefined) flatMetadata['will-base'] = state.will.willBase;
            if (state.will.temporaryWill !== undefined) flatMetadata['temporary-will'] = state.will.temporaryWill;
            if (state.will.temporaryWillMax !== undefined)
                flatMetadata['temporary-will-max'] = state.will.temporaryWillMax;
        }

        if (state.tp !== undefined) flatMetadata['training-points'] = state.tp;
        if (state.currency !== undefined) flatMetadata['currency'] = state.currency;

        if (state.trackers) {
            if (state.trackers.firstHitAcc !== undefined)
                flatMetadata['first-hit-acc-active'] = state.trackers.firstHitAcc;
            if (state.trackers.firstHitDmg !== undefined)
                flatMetadata['first-hit-dmg-active'] = state.trackers.firstHitDmg;
        }

        if (state.moves) flatMetadata['moves-data'] = JSON.stringify(state.moves);
        if (state.inventory) flatMetadata['inv-data'] = JSON.stringify(state.inventory);
        if (state.skillChecks) flatMetadata['skill-checks-data'] = JSON.stringify(state.skillChecks);
        if (state.extraCategories) flatMetadata['extra-skills-data'] = JSON.stringify(state.extraCategories);
        if (state.statuses) flatMetadata['status-list'] = JSON.stringify(state.statuses);
        if (state.effects) flatMetadata['effects-data'] = JSON.stringify(state.effects);
        if (state.customInfo) flatMetadata['custom-info-data'] = JSON.stringify(state.customInfo);

        if (state.stats) {
            Object.entries(state.stats).forEach(([stat, vals]) => {
                flatMetadata[`${stat}-base`] = vals.base;
                flatMetadata[`${stat}-rank`] = vals.rank;
                flatMetadata[`${stat}-buff`] = vals.buff;
                flatMetadata[`${stat}-debuff`] = vals.debuff;
                flatMetadata[`${stat}-limit`] = vals.limit;
            });
        }

        if (state.socials) {
            Object.entries(state.socials).forEach(([stat, vals]) => {
                flatMetadata[`${stat}-base`] = vals.base;
                flatMetadata[`${stat}-rank`] = vals.rank;
                flatMetadata[`${stat}-buff`] = vals.buff;
                flatMetadata[`${stat}-debuff`] = vals.debuff;
                flatMetadata[`${stat}-limit`] = vals.limit;
            });
        }

        if (state.skills) {
            Object.entries(state.skills).forEach(([skill, vals]) => {
                flatMetadata[`${skill}-base`] = vals.base;
                flatMetadata[`${skill}-buff`] = vals.buff;
                if (vals.customName) flatMetadata[`label-${skill}`] = vals.customName;
            });
        }
    } catch (error) {
        console.error('Error mapping Zustand state to OBR Metadata:', error);
    }

    return flatMetadata;
}
