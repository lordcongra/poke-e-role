import OBR from '@owlbear-rodeo/sdk';

export interface ChunkEnvelope {
    __chunked: true;
    msgId: string;
    idx: number;
    total: number;
    chunk: string;
}

export const MAX_BROADCAST_SLICE = 16000; // 16kB per slice, safely below WebRTC 64kB limit

/**
 * Sends any serializable payload across an Owlbear Rodeo broadcast channel,
 * automatically slicing it into 16kB chunks if the JSON exceeds the safe message threshold.
 */
export async function sendSafeBroadcastPayload<T>(
    channel: string,
    payload: T,
    options: { destination: 'LOCAL' | 'REMOTE' | 'ALL' } = { destination: 'REMOTE' }
): Promise<void> {
    if (!OBR.isAvailable) return;

    const raw = JSON.stringify(payload);
    if (raw.length <= MAX_BROADCAST_SLICE) {
        await OBR.broadcast.sendMessage(channel, payload, options);
        return;
    }

    const msgId = crypto.randomUUID();
    const total = Math.ceil(raw.length / MAX_BROADCAST_SLICE);

    for (let i = 0; i < total; i++) {
        const slice = raw.slice(i * MAX_BROADCAST_SLICE, (i + 1) * MAX_BROADCAST_SLICE);
        const env: ChunkEnvelope = {
            __chunked: true,
            msgId,
            idx: i,
            total,
            chunk: slice
        };
        await OBR.broadcast.sendMessage(channel, env, options);
    }
}

/**
 * Registers a broadcast listener that transparently reassembles chunked envelopes
 * before invoking the callback with the full reconstructed payload.
 */
export function registerSafeBroadcastListener<T>(
    channel: string,
    onPayload: (payload: T) => void | Promise<void>
): () => void {
    if (!OBR.isAvailable) {
        return () => {};
    }

    const chunkBuffer = new Map<string, { total: number; chunks: string[]; received: number }>();

    return OBR.broadcast.onMessage(channel, async (event) => {
        const data = event.data as T | ChunkEnvelope;
        if ((data as ChunkEnvelope)?.__chunked) {
            const env = data as ChunkEnvelope;
            let entry = chunkBuffer.get(env.msgId);
            if (!entry) {
                entry = { total: env.total, chunks: Array(env.total).fill(''), received: 0 };
                chunkBuffer.set(env.msgId, entry);
            }
            if (!entry.chunks[env.idx]) {
                entry.chunks[env.idx] = env.chunk;
                entry.received++;
            }
            if (entry.received === entry.total) {
                chunkBuffer.delete(env.msgId);
                try {
                    const parsed = JSON.parse(entry.chunks.join('')) as T;
                    await onPayload(parsed);
                } catch (e) {
                    console.error(`[BroadcastUtils] Failed to parse reassembled chunk for ${channel}:`, e);
                }
            }
            return;
        }

        await onPayload(data as T);
    });
}
