import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { sendMessageMock, onMessageMock, mockObr } = vi.hoisted(() => {
    const sendMessageMock = vi.fn().mockResolvedValue(undefined);
    const onMessageMock = vi.fn();
    const mockObr = {
        isAvailable: true,
        broadcast: {
            sendMessage: sendMessageMock,
            onMessage: onMessageMock
        }
    };
    return { sendMessageMock, onMessageMock, mockObr };
});

vi.mock('@owlbear-rodeo/sdk', () => ({
    default: mockObr
}));

import {
    MAX_BROADCAST_SLICE,
    CHUNK_TTL_MS,
    type ChunkEnvelope,
    sendSafeBroadcastPayload,
    registerSafeBroadcastListener
} from '@/hooks/owlbearSync/owlbearBroadcastUtils';

type BroadcastHandler = (event: { data: unknown; connectionId: string }) => void | Promise<void>;

describe('owlbearBroadcastUtils', () => {
    let registeredHandler: BroadcastHandler | null = null;

    beforeEach(() => {
        mockObr.isAvailable = true;
        registeredHandler = null;
        sendMessageMock.mockClear();
        onMessageMock.mockReset();
        onMessageMock.mockImplementation((_channel: string, handler: BroadcastHandler) => {
            registeredHandler = handler;
            return () => {
                registeredHandler = null;
            };
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sends payloads <= MAX_BROADCAST_SLICE (12000 chars) unchunked', async () => {
        expect(MAX_BROADCAST_SLICE).toBe(12000);
        const overhead = JSON.stringify({ text: '' }).length;
        const exactPayload = { text: 'a'.repeat(MAX_BROADCAST_SLICE - overhead) };

        await sendSafeBroadcastPayload('test/channel', exactPayload);

        expect(sendMessageMock).toHaveBeenCalledTimes(1);
        expect(sendMessageMock).toHaveBeenCalledWith('test/channel', exactPayload, { destination: 'REMOTE' });
    });

    it('splits payloads > MAX_BROADCAST_SLICE into chunk envelopes', async () => {
        const oversizedPayload = { text: 'b'.repeat(MAX_BROADCAST_SLICE * 2 + 100) };
        const rawLength = JSON.stringify(oversizedPayload).length;
        const expectedTotal = Math.ceil(rawLength / MAX_BROADCAST_SLICE);

        await sendSafeBroadcastPayload('test/channel', oversizedPayload);

        expect(sendMessageMock).toHaveBeenCalledTimes(expectedTotal);
        const envelopes = sendMessageMock.mock.calls.map((call) => call[1] as ChunkEnvelope);
        const msgId = envelopes[0].msgId;
        envelopes.forEach((env, index) => {
            expect(env.__chunked).toBe(true);
            expect(env.msgId).toBe(msgId);
            expect(env.idx).toBe(index);
            expect(env.total).toBe(expectedTotal);
            expect(env.chunk.length).toBeLessThanOrEqual(MAX_BROADCAST_SLICE);
        });
        expect(JSON.parse(envelopes.map((e) => e.chunk).join(''))).toEqual(oversizedPayload);
    });

    it('reassembles out-of-order chunks and handles duplicates and empty slices', async () => {
        const onPayload = vi.fn();
        registerSafeBroadcastListener<{ msg: string; count: number }>('test/channel', onPayload);
        expect(registeredHandler).not.toBeNull();

        const fullJson = JSON.stringify({ msg: 'hello world', count: 42 });
        const part0 = fullJson.slice(0, 10);
        const part1 = '';
        const part2 = fullJson.slice(10);

        await registeredHandler!({ data: { __chunked: true, msgId: 'm1', idx: 2, total: 3, chunk: part2 }, connectionId: 'c1' });
        await registeredHandler!({ data: { __chunked: true, msgId: 'm1', idx: 2, total: 3, chunk: part2 }, connectionId: 'c1' });
        await registeredHandler!({ data: { __chunked: true, msgId: 'm1', idx: 0, total: 3, chunk: part0 }, connectionId: 'c1' });
        expect(onPayload).not.toHaveBeenCalled();

        await registeredHandler!({ data: { __chunked: true, msgId: 'm1', idx: 1, total: 3, chunk: part1 }, connectionId: 'c1' });
        expect(onPayload).toHaveBeenCalledTimes(1);
        expect(onPayload).toHaveBeenCalledWith({ msg: 'hello world', count: 42 });
    });

    it('safely ignores invalid idx and total bounds without throwing or invoking onPayload', async () => {
        const onPayload = vi.fn();
        registerSafeBroadcastListener('test/channel', onPayload);

        const invalidEnvelopes: ChunkEnvelope[] = [
            { __chunked: true, msgId: 'bad1', idx: -1, total: 2, chunk: '{}' },
            { __chunked: true, msgId: 'bad2', idx: 2, total: 2, chunk: '{}' },
            { __chunked: true, msgId: 'bad3', idx: 0, total: 0, chunk: '{}' },
            { __chunked: true, msgId: 'bad4', idx: 0, total: -3, chunk: '{}' },
            { __chunked: true, msgId: 'bad5', idx: 0, total: 101, chunk: '{}' },
            { __chunked: true, msgId: 'bad6', idx: 0.5, total: 2, chunk: '{}' }
        ];

        for (const env of invalidEnvelopes) {
            await expect(registeredHandler!({ data: env, connectionId: 'c1' })).resolves.toBeUndefined();
        }
        expect(onPayload).not.toHaveBeenCalled();
    });

    it('evicts incomplete chunked messages after CHUNK_TTL_MS (30s)', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

        const onPayload = vi.fn();
        registerSafeBroadcastListener<{ ok: boolean }>('test/channel', onPayload);

        // Send first half of 'stale' message
        await registeredHandler!({
            data: { __chunked: true, msgId: 'stale', idx: 0, total: 2, chunk: '{"ok":' },
            connectionId: 'c1'
        });

        // Advance past 30s TTL and send a chunk for another message (triggers pruning)
        vi.advanceTimersByTime(CHUNK_TTL_MS + 1);
        await registeredHandler!({
            data: { __chunked: true, msgId: 'other', idx: 0, total: 2, chunk: '{"ok":' },
            connectionId: 'c1'
        });

        // Late second half of 'stale' should not reassemble because chunk 0 was evicted
        await registeredHandler!({
            data: { __chunked: true, msgId: 'stale', idx: 1, total: 2, chunk: 'true}' },
            connectionId: 'c1'
        });
        expect(onPayload).not.toHaveBeenCalled();

        // Completing 'other' within TTL still succeeds
        await registeredHandler!({
            data: { __chunked: true, msgId: 'other', idx: 1, total: 2, chunk: 'true}' },
            connectionId: 'c1'
        });
        expect(onPayload).toHaveBeenCalledTimes(1);
        expect(onPayload).toHaveBeenCalledWith({ ok: true });
    });
});

