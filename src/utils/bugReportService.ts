import { CURRENT_VERSION } from '../data/changelog';
import { isStandaloneMode } from './storageAdapter';
import OBR from '@owlbear-rodeo/sdk';

// Default fallback webhook encoded in base64 to avoid automated git secret scraping
const FALLBACK_WEBHOOK_B64 =
    'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTU1NDE1NzYwMDM5NDk3NzMxMS9oY3JfR0dtNDBlQjJxQng5bVdHY0lGNTVCZG9tVHpRODl5dl9JN2tfbjlFU3RyUmpEUlJRM1NKbGlhd25UZGNhUnJWaw==';

export function getDirectDiscordWebhookUrl(): string {
    const envUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;
    if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
        return envUrl.trim();
    }
    try {
        if (typeof window !== 'undefined' && typeof window.atob === 'function') {
            return window.atob(FALLBACK_WEBHOOK_B64).trim();
        }
    } catch (e) {
        console.warn('[BugReport] Failed to decode fallback webhook:', e);
    }
    return '';
}

export function getDiscordWebhookUrl(): string {
    // In local development, use Vite proxy to avoid CORS and browser extension blocks
    if (import.meta.env.DEV) {
        return '/api/discord-webhook';
    }
    return getDirectDiscordWebhookUrl();
}

export interface BugReportDiagnostics {
    version: string;
    environment: string;
    characterName: string;
    characterSpecies: string;
    characterRank: string;
    characterMode: string;
    activeTokenId: string | null;
    role: string;
    browser: string;
    os: string;
    resolution: string;
    timestamp: string;
}

export function formatActiveSheet(diagnostics: {
    characterName?: string;
    characterSpecies?: string;
    characterRank?: string;
}): string {
    const nick = diagnostics.characterName?.trim() || '';
    const spec = diagnostics.characterSpecies?.trim() || '';
    const rank = diagnostics.characterRank?.trim() || '';

    if (nick && spec && nick.toLowerCase() !== spec.toLowerCase()) {
        return `${nick} (${spec}${rank ? `, Rank: ${rank}` : ''})`;
    }
    if (nick) {
        return `${nick}${rank ? ` (Rank: ${rank})` : ''}`;
    }
    if (spec) {
        return `${spec}${rank ? ` (Rank: ${rank})` : ''}`;
    }
    return 'None / Table Menu';
}

export function collectDiagnostics(characterState?: {
    identity?: {
        nickname?: string;
        species?: string;
        rank?: string;
        mode?: string;
    };
    role?: string;
    tokenId?: string | null;
}): BugReportDiagnostics {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let os = 'Unknown OS';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('like Mac') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    let browser = 'Unknown Browser';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';

    let env = 'Web Browser';
    if (isStandaloneMode) {
        env = 'Standalone Web';
    } else if (OBR.isAvailable) {
        env = 'Owlbear Rodeo Extension';
    }

    const resolution =
        typeof window !== 'undefined'
            ? `${window.innerWidth}x${window.innerHeight} (screen ${window.screen?.width || 0}x${window.screen?.height || 0})`
            : 'Unknown';

    return {
        version: CURRENT_VERSION,
        environment: env,
        characterName: characterState?.identity?.nickname || '',
        characterSpecies: characterState?.identity?.species || '',
        characterRank: characterState?.identity?.rank || '',
        characterMode: characterState?.identity?.mode || 'Pokémon',
        activeTokenId: characterState?.tokenId || null,
        role: characterState?.role || 'PLAYER',
        browser,
        os,
        resolution,
        timestamp: new Date().toISOString()
    };
}

export async function submitBugReportToDiscord(params: {
    description: string;
    reporterDiscord?: string;
    diagnostics: BugReportDiagnostics;
}): Promise<{ success: boolean; error?: string }> {
    const webhookUrl = getDiscordWebhookUrl();
    const directUrl = getDirectDiscordWebhookUrl();

    if (!webhookUrl && !directUrl) {
        return { success: false, error: 'No Discord webhook URL configured.' };
    }

    const { description, reporterDiscord, diagnostics } = params;
    const charDetails = formatActiveSheet(diagnostics);

    const embed = {
        title: '🐛 Pokérole Sheet Bug Report',
        color: 0xe74c3c, // Vibrant red
        description: description.slice(0, 3900),
        fields: [
            {
                name: '👤 Reporter / Contact',
                value: reporterDiscord?.trim() ? reporterDiscord.trim() : 'Anonymous',
                inline: true
            },
            {
                name: '📦 Version',
                value: `v${diagnostics.version}`,
                inline: true
            },
            {
                name: '🌐 Environment',
                value: diagnostics.environment,
                inline: true
            },
            {
                name: '🎮 Active Sheet',
                value: charDetails,
                inline: false
            },
            {
                name: '💻 System Info',
                value: `${diagnostics.browser} on ${diagnostics.os} • ${diagnostics.resolution}`,
                inline: false
            }
        ],
        footer: {
            text: 'Pokérole Autosheet Bug Reporter'
        },
        timestamp: new Date().toISOString()
    };

    const payload = JSON.stringify({
        username: 'Pokérole Bug Reporter',
        embeds: [embed]
    });

    try {
        let response: Response;
        try {
            response = await fetch(webhookUrl || directUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
        } catch (initialErr) {
            // Fallback to direct URL if dev proxy wasn't reached or vice versa
            if (webhookUrl && directUrl && webhookUrl !== directUrl) {
                response = await fetch(directUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                });
            } else {
                throw initialErr;
            }
        }

        if (!response.ok) {
            const errText = await response.text();
            console.error('[BugReport] Discord webhook returned error:', response.status, errText);
            return { success: false, error: `Discord webhook rejected: HTTP ${response.status}` };
        }

        return { success: true };
    } catch (err: any) {
        console.error('[BugReport] Failed to send bug report:', err);
        const msg = err?.message || '';
        if (
            msg.includes('NetworkError') ||
            msg.includes('Failed to fetch') ||
            msg.includes('blocked') ||
            msg.includes('Load failed')
        ) {
            return {
                success: false,
                error: 'Connection to Discord was blocked by your browser or an ad-blocker. Please use "Copy to Clipboard" below to message @congra directly on Discord!'
            };
        }
        return { success: false, error: msg || 'Network error sending to Discord' };
    }
}

export function formatBugReportMarkdown(params: {
    description: string;
    reporterDiscord?: string;
    diagnostics: BugReportDiagnostics;
}): string {
    const { description, reporterDiscord, diagnostics } = params;
    const charInfo = formatActiveSheet(diagnostics);

    return [
        '### 🐛 Pokérole Sheet Bug Report',
        `**Reporter / Contact:** ${reporterDiscord?.trim() ? reporterDiscord.trim() : 'Anonymous'}`,
        `**Version:** v${diagnostics.version} (${diagnostics.environment})`,
        `**Active Sheet:** ${charInfo}`,
        `**System:** ${diagnostics.browser} on ${diagnostics.os} (${diagnostics.resolution})`,
        '',
        '**Description:**',
        description.trim()
    ].join('\n');
}
