/**
 * Pure room settings metadata mapping and transformation utilities.
 * Completely decoupled from browser/OBR globals for testability and zero-side-effect imports.
 */

export function applyRoomUpdatesToMeta(
    roomMeta: Record<string, unknown>,
    updates: Record<string, unknown>
): Record<string, unknown> {
    for (const [k, v] of Object.entries(updates)) {
        if (k === 'ruleset') roomMeta.ruleset = v;
        else if (k === 'pain') roomMeta.painEnabled = v === 'Enabled' || v === true;
        else if (k === 'diceEngine') roomMeta.diceEngine = v === 'log-only' ? 'log-only' : 'car';
        else if (k === 'homebrewAccess') roomMeta.homebrewAccess = v;
        else if (k === 'gmOnlyLootGen') roomMeta.gmOnlyLootGen = Boolean(v);
        else if (k === 'gmOnlyGenerators') roomMeta.gmOnlyGenerators = Boolean(v);
        else if (k === 'gmOnlyMatchups') roomMeta.gmOnlyMatchups = Boolean(v);
        else if (k === 'gmOnlyDamageOverride') roomMeta.gmOnlyDamageOverride = Boolean(v);
        else if (k === 'gmOnlyTrackers') roomMeta.gmOnlyTrackers = Boolean(v);
        else if (k === 'gmOnlyAttributeLock') roomMeta.gmOnlyAttributeLock = Boolean(v);
        else if (k === 'gmOnlyPullEnemies') roomMeta.gmOnlyPullEnemies = Boolean(v);
        else if (k === 'defaultNpcInitiativeHidden') roomMeta.defaultNpcInitiativeHidden = Boolean(v);
        else if (k === 'pmdSkills') roomMeta.pmdSkills = Boolean(v);
        else if (k === 'gmDemoMode') roomMeta.gmDemoMode = Boolean(v);
        else if (k === 'roomDefaultScale') roomMeta.roomDefaultScale = Number(v);
        else if (k === 'roomDefaultOffsetX') roomMeta.roomDefaultOffsetX = Number(v);
        else if (k === 'roomDefaultOffsetY') roomMeta.roomDefaultOffsetY = Number(v);
        else if (k === 'roomHideHpBar') roomMeta.roomHideHpBar = Boolean(v);
        else if (k === 'roomHideHpText') roomMeta.roomHideHpText = Boolean(v);
        else if (k === 'roomHideWillBar') roomMeta.roomHideWillBar = Boolean(v);
        else if (k === 'roomHideWillText') roomMeta.roomHideWillText = Boolean(v);
        else if (k === 'roomHideDef') roomMeta.roomHideDef = Boolean(v);
        else if (k === 'roomHideActions') roomMeta.roomHideActions = Boolean(v);
        else if (k === 'roomHideEvade') roomMeta.roomHideEvade = Boolean(v);
        else if (k === 'roomHideClash') roomMeta.roomHideClash = Boolean(v);
        else if (k === 'roomHideHudPlayersOnly') roomMeta.roomHideHudPlayersOnly = Boolean(v);
        else if (k === 'roomHideHudEnemiesOnly') roomMeta.roomHideHudEnemiesOnly = Boolean(v);
        else if (k === 'roomTrackersRequireInitiative') roomMeta.roomTrackersRequireInitiative = Boolean(v);
        else if (k === 'activeRoomCampaignName') roomMeta.activeRoomCampaignName = v;
        else if (k === 'activeRoomCampaignId') roomMeta.activeRoomCampaignId = v;
        else roomMeta[k] = v;
    }
    return roomMeta;
}

export function mapRoomSettings(sData: Record<string, unknown>) {
    return {
        ruleset: sData.ruleset !== undefined ? String(sData.ruleset) : undefined,
        pain: sData.painEnabled !== undefined ? (sData.painEnabled ? 'Enabled' : 'Disabled') : undefined,
        diceEngine:
            sData.diceEngine !== undefined
                ? sData.diceEngine === 'log-only'
                    ? ('log-only' as const)
                    : ('car' as const)
                : undefined,
        homebrewAccess: sData.homebrewAccess !== undefined ? String(sData.homebrewAccess) : undefined,
        gmOnlyLootGen: sData.gmOnlyLootGen !== undefined ? Boolean(sData.gmOnlyLootGen) : undefined,
        gmOnlyGenerators: sData.gmOnlyGenerators !== undefined ? Boolean(sData.gmOnlyGenerators) : undefined,
        gmOnlyMatchups: sData.gmOnlyMatchups !== undefined ? Boolean(sData.gmOnlyMatchups) : undefined,
        gmOnlyDamageOverride:
            sData.gmOnlyDamageOverride !== undefined ? Boolean(sData.gmOnlyDamageOverride) : undefined,
        gmOnlyTrackers: sData.gmOnlyTrackers !== undefined ? Boolean(sData.gmOnlyTrackers) : undefined,
        gmOnlyAttributeLock: sData.gmOnlyAttributeLock !== undefined ? Boolean(sData.gmOnlyAttributeLock) : undefined,
        gmOnlyPullEnemies: sData.gmOnlyPullEnemies !== undefined ? Boolean(sData.gmOnlyPullEnemies) : undefined,
        defaultNpcInitiativeHidden:
            sData.defaultNpcInitiativeHidden !== undefined ? Boolean(sData.defaultNpcInitiativeHidden) : undefined,
        pmdSkills: sData.pmdSkills !== undefined ? Boolean(sData.pmdSkills) : undefined,
        gmDemoMode: sData.gmDemoMode !== undefined ? Boolean(sData.gmDemoMode) : undefined,
        roomDefaultScale: sData.roomDefaultScale !== undefined ? Number(sData.roomDefaultScale) : undefined,
        roomDefaultOffsetX: sData.roomDefaultOffsetX !== undefined ? Number(sData.roomDefaultOffsetX) : undefined,
        roomDefaultOffsetY: sData.roomDefaultOffsetY !== undefined ? Number(sData.roomDefaultOffsetY) : undefined,
        activeRoomCampaignName:
            sData.activeRoomCampaignName !== undefined ? String(sData.activeRoomCampaignName) : undefined,
        activeRoomCampaignId: sData.activeRoomCampaignId !== undefined ? String(sData.activeRoomCampaignId) : undefined,
        roomHideHpBar: sData.roomHideHpBar !== undefined ? Boolean(sData.roomHideHpBar) : undefined,
        roomHideHpText: sData.roomHideHpText !== undefined ? Boolean(sData.roomHideHpText) : undefined,
        roomHideWillBar: sData.roomHideWillBar !== undefined ? Boolean(sData.roomHideWillBar) : undefined,
        roomHideWillText: sData.roomHideWillText !== undefined ? Boolean(sData.roomHideWillText) : undefined,
        roomHideDef: sData.roomHideDef !== undefined ? Boolean(sData.roomHideDef) : undefined,
        roomHideActions: sData.roomHideActions !== undefined ? Boolean(sData.roomHideActions) : undefined,
        roomHideEvade: sData.roomHideEvade !== undefined ? Boolean(sData.roomHideEvade) : undefined,
        roomHideClash: sData.roomHideClash !== undefined ? Boolean(sData.roomHideClash) : undefined,
        roomHideHudPlayersOnly:
            sData.roomHideHudPlayersOnly !== undefined ? Boolean(sData.roomHideHudPlayersOnly) : undefined,
        roomHideHudEnemiesOnly:
            sData.roomHideHudEnemiesOnly !== undefined ? Boolean(sData.roomHideHudEnemiesOnly) : undefined,
        roomTrackersRequireInitiative:
            sData.roomTrackersRequireInitiative !== undefined
                ? Boolean(sData.roomTrackersRequireInitiative)
                : undefined
    };
}
