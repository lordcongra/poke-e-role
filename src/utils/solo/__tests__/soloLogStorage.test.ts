import { describe, it, expect, beforeEach } from 'vitest';
import {
    getActiveCampaign,
    setActiveCampaign,
    getSoloCampaigns,
    createSoloCampaign,
    deleteSoloCampaign,
    getSoloLogs,
    addSoloLog,
    deleteSoloLog,
    clearSoloLogs,
    DEFAULT_CAMPAIGN
} from '../soloLogStorage';

describe('soloLogStorage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('Campaigns', () => {
        it('returns default campaign when nothing is saved', async () => {
            expect(getActiveCampaign()).toBe(DEFAULT_CAMPAIGN);
            const campaigns = await getSoloCampaigns();
            expect(campaigns).toContain(DEFAULT_CAMPAIGN);
        });

        it('creates a new campaign and sets it as active', async () => {
            await createSoloCampaign('Kanto Journey');
            const campaigns = await getSoloCampaigns();
            expect(campaigns).toContain('Kanto Journey');

            setActiveCampaign('Kanto Journey');
            expect(getActiveCampaign()).toBe('Kanto Journey');
        });

        it('deletes a campaign and clears its active reference', async () => {
            await createSoloCampaign('Johto Expedition');
            await addSoloLog({
                campaign: 'Johto Expedition',
                type: 'fate',
                question: 'Is the route clear?',
                odds: 1,
                oddsLabel: 'Likely (+1)',
                chaosFactor: 5,
                target: 65,
                roll: 40,
                result: 'Yes',
                label: 'Fate Check'
            });

            const beforeLogs = await getSoloLogs('Johto Expedition');
            expect(beforeLogs).toHaveLength(1);

            await deleteSoloCampaign('Johto Expedition');
            const campaigns = await getSoloCampaigns();
            expect(campaigns).not.toContain('Johto Expedition');

            const afterLogs = await getSoloLogs('Johto Expedition');
            expect(afterLogs).toHaveLength(0);
        });
    });

    describe('Logs CRUD', () => {
        it('adds a fate log entry and retrieves it', async () => {
            const entry = await addSoloLog({
                campaign: DEFAULT_CAMPAIGN,
                type: 'fate',
                question: 'Is there a Pokémon Center ahead?',
                odds: 0,
                oddsLabel: '50/50',
                chaosFactor: 5,
                target: 50,
                roll: 12,
                result: 'Yes',
                label: 'Fate Check',
                isRandomEvent: false
            });

            expect(entry.id).toBeDefined();
            expect(entry.timestamp).toBeDefined();
            expect(entry.question).toBe('Is there a Pokémon Center ahead?');

            const logs = await getSoloLogs(DEFAULT_CAMPAIGN);
            expect(logs).toHaveLength(1);
            expect(logs[0].id).toBe(entry.id);
        });

        it('deletes an individual log entry', async () => {
            const entry1 = await addSoloLog({
                campaign: DEFAULT_CAMPAIGN,
                type: 'prompt',
                roll: 15,
                result: 'Territorial Alpha',
                label: 'Wild PKMN Disposition'
            });

            const entry2 = await addSoloLog({
                campaign: DEFAULT_CAMPAIGN,
                type: 'prompt',
                roll: 8,
                result: 'Ancient Mural',
                label: 'Ruin Anomaly'
            });

            let logs = await getSoloLogs(DEFAULT_CAMPAIGN);
            expect(logs).toHaveLength(2);

            await deleteSoloLog(entry1.id);
            logs = await getSoloLogs(DEFAULT_CAMPAIGN);
            expect(logs).toHaveLength(1);
            expect(logs[0].id).toBe(entry2.id);
        });

        it('clears all logs for a campaign', async () => {
            await addSoloLog({
                campaign: 'CampA',
                type: 'fate',
                roll: 30,
                result: 'Yes',
                label: 'Fate Check'
            });
            await addSoloLog({
                campaign: 'CampA',
                type: 'fate',
                roll: 80,
                result: 'No',
                label: 'Fate Check'
            });
            await addSoloLog({
                campaign: 'CampB',
                type: 'fate',
                roll: 40,
                result: 'Yes',
                label: 'Fate Check'
            });

            await clearSoloLogs('CampA');

            const logsA = await getSoloLogs('CampA');
            expect(logsA).toHaveLength(0);

            const logsB = await getSoloLogs('CampB');
            expect(logsB).toHaveLength(1);
        });
    });
});
