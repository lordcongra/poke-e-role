import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    getBugReportEndpoint,
    collectDiagnostics,
    submitBugReportToDiscord,
    type BugReportDiagnostics
} from '@/utils/common/bugReportService';

describe('bugReportService', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('ignores VITE_DISCORD_WEBHOOK_URL and uses VITE_BUG_REPORT_ENDPOINT or default proxy', () => {
        vi.stubEnv('VITE_DISCORD_WEBHOOK_URL', 'https://discord.com/api/webhooks/should-be-ignored');
        vi.stubEnv('VITE_BUG_REPORT_ENDPOINT', '');

        const defaultEndpoint = getBugReportEndpoint();
        expect(defaultEndpoint).toBe('https://pkr-bug-reporter.lordcongra.workers.dev');
        expect(defaultEndpoint).not.toContain('discord.com/api/webhooks');

        vi.stubEnv('VITE_BUG_REPORT_ENDPOINT', 'https://custom-proxy.example.com/report');
        expect(getBugReportEndpoint()).toBe('https://custom-proxy.example.com/report');
    });

    it('collects only disclosed diagnostic fields and submits matching embed fields', async () => {
        const diagnostics: BugReportDiagnostics = collectDiagnostics({
            identity: {
                nickname: 'Sparky',
                species: 'Pikachu',
                rank: 'Starter'
            }
        });

        expect(Object.keys(diagnostics).sort()).toEqual([
            'browser',
            'characterName',
            'characterRank',
            'characterSpecies',
            'environment',
            'os',
            'resolution',
            'version'
        ]);

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            text: async () => ''
        });
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const res = await submitBugReportToDiscord({
            description: 'Test bug description',
            reporterDiscord: '@tester',
            diagnostics
        });

        expect(res.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
        const parsed = JSON.parse(String(init.body)) as {
            embeds: Array<{ fields: Array<{ name: string; value: string }> }>;
        };
        const fieldNames = parsed.embeds[0].fields.map((f) => f.name);
        expect(fieldNames).toEqual([
            '👤 Reporter / Contact',
            '📦 Version',
            '🌐 Environment',
            '🎮 Active Sheet',
            '💻 System Info'
        ]);
        expect(parsed.embeds[0].fields[0].value).toBe('@tester');
        expect(parsed.embeds[0].fields[3].value).toBe('Sparky (Pikachu, Rank: Starter)');
    });
});

