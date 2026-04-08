import type { CharacterState } from '../store/storeTypes';

/**
 * A strict mapping utility to prevent Owlbear Rodeo token data bloat.
 * * Owlbear Rodeo expects token metadata to be a shallow dictionary. This function
 * explicitly cherry-picks values from our deeply nested Zustand CharacterState
 * and maps them to their OBR keys.
 */
export function flattenStateToMetadata(state: CharacterState): Record<string, string | number | boolean> {
    const flatMetadata: Record<string, string | number | boolean> = {};

    try {
        // --- FORM SHIFTING & BACKUPS (Sanitized) ---
        // We safely transfer backups, but ONLY if they aren't the old bloated inception loops!
        const sanitizeBackup = (backupString: string | undefined, key: string) => {
            if (!backupString) return;
            try {
                const parsed = JSON.parse(backupString);
                // The old bloat bug contained the entire nested state (parsed.identity, parsed.health, etc.)
                // The new clean code only backs up small objects (parsed.species, parsed.strBase, etc.)
                if (parsed.identity || parsed.health || parsed.backupFormData) {
                    console.warn(`Blocked bloated legacy data for ${key} during import to protect token.`);
                } else {
                    flatMetadata[key] = backupString;
                }
            } catch (e) {
                flatMetadata[key] = backupString;
            }
        };

        // --- IDENTITY ---
        if (state.identity) {
            if (state.identity.nickname !== undefined) flatMetadata['name'] = state.identity.nickname;
            if (state.identity.species !== undefined) flatMetadata['species'] = state.identity.species;
            if (state.identity.nature !== undefined) flatMetadata['nature'] = state.identity.nature;
            if (state.identity.ability !== undefined) flatMetadata['ability'] = state.identity.ability;
            if (state.identity.type1 !== undefined) flatMetadata['type1'] = state.identity.type1;
            if (state.identity.type2 !== undefined) flatMetadata['type2'] = state.identity.type2;
            if (state.identity.mode !== undefined) flatMetadata['mode'] = state.identity.mode;
            
            // New Transformation Variables
            if (state.identity.activeTransformation !== undefined) flatMetadata['active-transformation'] = state.identity.activeTransformation;
            if (state.identity.terastallizeAffinity !== undefined) flatMetadata['terastallize-affinity'] = state.identity.terastallizeAffinity;
            if (state.identity.terastallizeBonusActive !== undefined) flatMetadata['terastallize-bonus-active'] = state.identity.terastallizeBonusActive;

            // Safely pass through our form backups
            sanitizeBackup(state.identity.baseFormData, 'base-form-data');
            sanitizeBackup(state.identity.altFormData, 'alt-form-data');
            sanitizeBackup(state.identity.pokemonBackup, 'pokemon-backup');
            sanitizeBackup(state.identity.trainerBackup, 'trainer-backup');
        }

        // --- HEALTH & RESOURCES ---
        if (state.health) {
            if (state.health.hpCurr !== undefined) flatMetadata['hp-curr'] = state.health.hpCurr;
            if (state.health.hpMax !== undefined) flatMetadata['hp-max-display'] = state.health.hpMax;
            if (state.health.hpBase !== undefined) flatMetadata['hp-base'] = state.health.hpBase;
            if (state.health.temporaryHitPoints !== undefined) flatMetadata['temporary-hit-points'] = state.health.temporaryHitPoints;
        }
        
        if (state.will) {
            if (state.will.willCurr !== undefined) flatMetadata['will-curr'] = state.will.willCurr;
            if (state.will.willMax !== undefined) flatMetadata['will-max-display'] = state.will.willMax;
            if (state.will.willBase !== undefined) flatMetadata['will-base'] = state.will.willBase;
        }

        // --- INVENTORY ROOT VARIABLES ---
        if (state.tp !== undefined) flatMetadata['training-points'] = state.tp;
        if (state.currency !== undefined) flatMetadata['currency'] = state.currency;

        // --- COMPLEX ARRAYS & OBJECTS (Stringified for flat metadata) ---
        if (state.moves) flatMetadata['moves-data'] = JSON.stringify(state.moves);
        if (state.inventory) flatMetadata['inv-data'] = JSON.stringify(state.inventory);
        if (state.skillChecks) flatMetadata['skill-checks-data'] = JSON.stringify(state.skillChecks);
        if (state.extraCategories) flatMetadata['extra-skills-data'] = JSON.stringify(state.extraCategories);
        if (state.statuses) flatMetadata['status-list'] = JSON.stringify(state.statuses);
        if (state.effects) flatMetadata['effects-data'] = JSON.stringify(state.effects);
        if (state.customInfo) flatMetadata['custom-info-data'] = JSON.stringify(state.customInfo);

        // --- STATS & SOCIALS ---
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
        console.error("Error mapping Zustand state to OBR Metadata:", error);
    }

    return flatMetadata;
}