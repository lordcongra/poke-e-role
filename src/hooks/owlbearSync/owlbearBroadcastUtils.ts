import OBR from '@owlbear-rodeo/sdk';

export interface ChunkEnvelope {
    __chunked: true;
    msgId: string;
    idx: number;
    total: number;
    chunk: string;
}

export const MAX_BROADCAST_SLICE = 12000; // 12kB per slice, safely below OBR 16kB message limit with envelope overhead
export const CHUNK_TTL_MS = 30_000;
const MAX_CHUNK_TOTAL = 100;

interface ChunkBufferEntry {
    total: number;
    chunks: string[];
    receivedIndices: Set<number>;
    createdAt: number;
}

/**
 * Sends any serializable payload across an Owlbear Rodeo broadcast channel,
 * automatically slicing it into 12kB chunks if the JSON exceeds the safe message threshold.
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

    const chunkBuffer = new Map<string, ChunkBufferEntry>();

    return OBR.broadcast.onMessage(channel, async (event) => {
        const data = event.data as T | ChunkEnvelope;
        if ((data as ChunkEnvelope)?.__chunked) {
            const env = data as ChunkEnvelope;
            if (
                typeof env.msgId !== 'string' ||
                !env.msgId ||
                typeof env.chunk !== 'string' ||
                !Number.isInteger(env.total) ||
                env.total <= 0 ||
                env.total > MAX_CHUNK_TOTAL ||
                !Number.isInteger(env.idx) ||
                env.idx < 0 ||
                env.idx >= env.total
            ) {
                return;
            }

            const now = Date.now();
            for (const [id, buffered] of chunkBuffer.entries()) {
                if (now - buffered.createdAt > CHUNK_TTL_MS) {
                    chunkBuffer.delete(id);
                }
            }

            let entry = chunkBuffer.get(env.msgId);
            if (!entry) {
                entry = {
                    total: env.total,
                    chunks: Array(env.total).fill(''),
                    receivedIndices: new Set<number>(),
                    createdAt: now
                };
                chunkBuffer.set(env.msgId, entry);
            } else if (entry.total !== env.total) {
                return;
            }

            if (!entry.receivedIndices.has(env.idx)) {
                entry.chunks[env.idx] = env.chunk;
                entry.receivedIndices.add(env.idx);
            }

            if (entry.receivedIndices.size === entry.total) {
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
