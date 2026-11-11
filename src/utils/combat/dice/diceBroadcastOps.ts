import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '@/store/useCharacterStore';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import { broadcastRollLog } from '@/utils/combat/rollLogSync';
import type { RollSyncData } from '@/hooks/owlbearSync/owlbearSyncConstants';

export interface CarDicePayload {
    mensaje: string;
    icon: string;
    diceData: { type: number; result: number }[];
    diceTheme?: Record<string, unknown>;
    isCrit?: boolean;
    isCritFail?: boolean;
}

export interface RollLogBroadcastOptions {
    id?: string;
    player: string;
    characterName?: string;
    tokenId?: string;
    playerId?: string;
    label: string;
    result: string;
    icon: string;
    rollType?: string;
    targetVisibility?: string;
    isCrit?: boolean;
    isCritFail?: boolean;
    chanceDice?: number;
    chanceEffect?: string;
    chanceRolled?: boolean;
}

export interface NativeObrRollParams {
    diceEngine: 'car' | 'log-only';
    obrPlayerName: string;
    playerName: string;
    playerId: string;
    tokenId?: string;
    finalLabel: string;
    icon: string;
    rollType: string;
    targetVisibility: string;
    isCrit?: boolean;
    isCritFail?: boolean;
    diceData: { type: number; result: number }[];
    options?: { chanceDice?: number; chanceEffect?: string; chanceRolled?: boolean };
    executeStateIntercepts: () => Promise<string>;
}

/**
 * Broadcasts a roll log entry across the room / local storage.
 */
export async function broadcastRollEntry(options: RollLogBroadcastOptions): Promise<void> {
    const rollLogData: RollSyncData = {
        id: options.id || crypto.randomUUID(),
        player: options.player,
        characterName: options.characterName || options.player,
        tokenId: options.tokenId,
        playerId: options.playerId,
        label: options.label,
        result: options.result,
        icon: options.icon,
        rollType: options.rollType,
        targetVisibility: options.targetVisibility,
        isCrit: options.isCrit,
        isCritFail: options.isCritFail,
        chanceDice: options.chanceDice,
        chanceEffect: options.chanceEffect,
        chanceRolled: options.chanceRolled
    };
    await broadcastRollLog(rollLogData);
}

/**
 * Dispatches 3D dice roll broadcast through Custom Action Rolls (CAR) integration.
 */
export async function broadcastCarDice(payload: CarDicePayload, targetVisibility: string): Promise<void> {
    if (!OBR.isAvailable || isStandaloneMode) return;
    if (targetVisibility === 'gm_only') {
        await OBR.broadcast.sendMessage('tirada:mensaje', payload, { destination: 'LOCAL' });
    } else {
        await OBR.broadcast.sendMessage('tirada:mensaje', payload, { destination: 'ALL' });
    }
}

/**
 * Resolves CAR dice theme data for the active player and detects legacy onrender URLs.
 */
export async function resolveCarDiceTheme(playerId: string): Promise<{
    diceTheme?: Record<string, unknown>;
    isOutdatedCarDetected: boolean;
}> {
    let diceTheme: Record<string, unknown> | undefined = undefined;
    let isOutdatedCarDetected = false;
    if (!OBR.isAvailable || isStandaloneMode) {
        return { diceTheme, isOutdatedCarDetected };
    }

    try {
        const roomMeta = await OBR.room.getMetadata();

        // Detect legacy onrender URL for Custom Action Rolls
        const metaKeys = Object.keys(roomMeta);
        if (metaKeys.some((k) => k.includes('action-manager.onrender.com') || k.includes('onrender.com'))) {
            isOutdatedCarDetected = true;
        }

        const allThemes = roomMeta['com.grupos-acciones.dice/roomDiceThemes'] as
            | Record<string, unknown>
            | undefined;

        if (allThemes && allThemes.players) {
            const playersMap = allThemes.players as Record<string, Record<string, unknown>>;
            const connectionId = OBR.player.getConnectionId ? await OBR.player.getConnectionId() : '';
            const playerThemeData = playersMap[playerId] || playersMap[connectionId];

            if (playerThemeData && playerThemeData.diceTheme) {
                diceTheme = playerThemeData.diceTheme as Record<string, unknown>;
            }
        }
    } catch (e) {
        console.warn('[DiceBroadcast] Failed to load dice theme', e);
    }

    return { diceTheme, isOutdatedCarDetected };
}

/**
 * Dispatches native OBR roll either as log-only or 3D CAR dice with delayed roll-log sync.
 */
export async function dispatchNativeObrRoll(params: NativeObrRollParams): Promise<void> {
    const {
        diceEngine,
        obrPlayerName,
        playerName,
        playerId,
        tokenId,
        finalLabel,
        icon,
        rollType,
        targetVisibility,
        isCrit,
        isCritFail,
        diceData,
        options,
        executeStateIntercepts
    } = params;

    if (diceEngine === 'log-only') {
        const compiledMessage = await executeStateIntercepts();
        await broadcastRollEntry({
            player: obrPlayerName,
            characterName: playerName,
            tokenId,
            playerId,
            label: finalLabel,
            result: compiledMessage,
            icon,
            rollType,
            targetVisibility,
            isCrit,
            isCritFail,
            chanceDice: options?.chanceDice,
            chanceEffect: options?.chanceEffect,
            chanceRolled: options?.chanceRolled
        });
        return;
    }

    const critPrefix = isCrit ? 'CRITICAL HIT! | ' : isCritFail ? 'CRITICAL FAILURE! | ' : '';
    const mensaje = `${obrPlayerName} | ${critPrefix}${finalLabel}`;

    const { diceTheme, isOutdatedCarDetected } = await resolveCarDiceTheme(playerId);

    if (isOutdatedCarDetected) {
        OBR.notification.show(
            '[WARNING] Outdated Custom Action Rolls URL detected! Please update your room to: https://custom-action-rolls.narcolepticdracu.com/manifest.json',
            'WARNING'
        );
    }

    const broadcastPayload = { mensaje, icon, diceData, diceTheme, isCrit, isCritFail };
    await broadcastCarDice(broadcastPayload, targetVisibility);

    const delayMs = targetVisibility === 'gm_only' ? 250 : 3500;
    setTimeout(async () => {
        try {
            const finalCompiledMsg = await executeStateIntercepts();

            await broadcastRollEntry({
                player: obrPlayerName,
                characterName: playerName,
                tokenId,
                playerId,
                label: finalLabel,
                result: finalCompiledMsg,
                icon,
                rollType,
                targetVisibility,
                isCrit,
                isCritFail,
                chanceDice: options?.chanceDice,
                chanceEffect: options?.chanceEffect,
                chanceRolled: options?.chanceRolled
            });
        } catch (error) {
            console.error('[DiceBroadcastOps] Delayed roll execution failed:', error);
        }
    }, delayMs);
}

/**
 * Broadcasts an informational announcement or rule clarification card to the roll log.
 */
export async function broadcastInfo(title: string, description: string): Promise<void> {
    const state = useCharacterStore.getState();
    const playerName = state.identity.nickname || state.identity.species || 'Trainer';
    const icon = state.identity.tokenImageUrl || `${import.meta.env?.BASE_URL || '/'}pokeball-token.svg`;
    const targetVisibility = state.identity.rolls === 'Private (GM)' ? 'gm_only' : 'everyone';
    const privacyTag = targetVisibility === 'gm_only' && !title.startsWith('[PRIVATE]') ? '[PRIVATE] ' : '';
    const finalTitle = `${privacyTag}${title}`;

    if (isStandaloneMode || !OBR.isAvailable) {
        await broadcastRollEntry({
            player: playerName,
            characterName: playerName,
            tokenId: state.tokenId || undefined,
            label: finalTitle,
            result: description,
            icon,
            rollType: 'info',
            isCrit: false,
            targetVisibility
        });
        return;
    }

    try {
        const playerId = await OBR.player.getId();
        const obrPlayerName = await OBR.player.getName();

        await broadcastRollEntry({
            player: obrPlayerName,
            characterName: playerName,
            tokenId: state.tokenId || undefined,
            playerId,
            label: finalTitle,
            result: description,
            icon,
            rollType: 'info',
            isCrit: false,
            targetVisibility
        });
    } catch (error) {
        console.error('[DiceRoller] Broadcast Info Error:', error);
    }
}
