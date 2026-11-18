import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrintLearnset } from '../PrintLearnset';
import type { MoveData, PrintConfig } from '../../../store/storeTypes';

const basePrintConfig: PrintConfig = {
    blankName: false,
    blankSpecies: false,
    blankType: false,
    blankNature: false,
    blankRank: false,
    blankAgeGender: false,
    blankStats: false,
    blankSocials: false,
    blankSkills: false,
    blankAbilities: false,
    blankMoves: false,
    blankItems: false,
    blankPassives: false,
    hidePortrait: false,
    hideCoreStats: false,
    hideSocialStats: false,
    hideCombatVitals: false,
    hideSkills: false,
    hideAbilities: false,
    hideMoves: false,
    hideItems: false,
    hidePassives: false,
    hideNotes: false,
    showLearnset: true,
    autoHideEmptySections: false,
    hideMoveDesc: false,
    hideKnowledgeSkills: false,
    hideCustomSkills: false,
    hideAge: false,
    coreSkillsOnly: false,
    showOnlyActiveAbility: false,
    compactMode: false,
    statStyle: 'dots',
    abilityDescStyle: 'all'
};

const mockMove = (name: string): MoveData => ({
    id: `move-${name}`,
    active: true,
    name,
    type: 'Normal',
    category: 'Physical',
    power: 2,
    acc1: 'Dexterity',
    acc2: 'Brawl',
    dmg1: 'Strength',
    desc: 'Test move description'
});

describe('PrintLearnset', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
    });

    it('returns null and does not render when config.showLearnset is false', async () => {
        const learnset = [
            { Learned: 'Starter', Name: 'Tackle' },
            { Learned: 'Starter', Name: 'Growl' }
        ];

        await act(async () => {
            root.render(
                <PrintLearnset
                    learnset={learnset}
                    moves={[]}
                    config={{ ...basePrintConfig, showLearnset: false }}
                />
            );
        });

        expect(container.innerHTML).toBe('');
        expect(container.querySelector('.print-sheet__section')).toBeNull();
    });

    it('returns null and does not render when learnset is empty or undefined', async () => {
        await act(async () => {
            root.render(
                <PrintLearnset
                    learnset={[]}
                    moves={[]}
                    config={{ ...basePrintConfig, showLearnset: true }}
                />
            );
        });

        expect(container.innerHTML).toBe('');

        await act(async () => {
            root.render(
                <PrintLearnset
                    learnset={undefined as unknown as Array<{ Learned: string; Name: string }>}
                    moves={[]}
                    config={{ ...basePrintConfig, showLearnset: true }}
                />
            );
        });

        expect(container.innerHTML).toBe('');
    });

    it('strictly prunes empty ranks: only populated ranks render (no Standard, Expert, Master, Champion)', async () => {
        const learnset = [
            { Learned: 'Rookie', Name: 'Quick Attack' },
            { Learned: 'Starter', Name: 'Tackle' },
            { Learned: 'Starter', Name: 'Tail Whip' }
        ];

        await act(async () => {
            root.render(
                <PrintLearnset
                    learnset={learnset}
                    moves={[]}
                    config={{ ...basePrintConfig, showLearnset: true }}
                />
            );
        });

        const section = container.querySelector('.print-sheet__section');
        expect(section).not.toBeNull();

        const title = container.querySelector('.print-sheet__section-title');
        expect(title?.textContent).toBe('Move Learnset');

        const rankHeaders = Array.from(container.querySelectorAll('.print-sheet__learnset-rank')).map(
            (el) => el.textContent?.trim()
        );

        // Sort order must be chronological: Starter first, then Rookie
        expect(rankHeaders).toEqual(['Starter', 'Rookie']);

        // Must NOT render empty ranks
        expect(rankHeaders).not.toContain('Standard');
        expect(rankHeaders).not.toContain('Advanced');
        expect(rankHeaders).not.toContain('Expert');
        expect(rankHeaders).not.toContain('Ace');
        expect(rankHeaders).not.toContain('Master');
        expect(rankHeaders).not.toContain('Champion');
        expect(rankHeaders).not.toContain('Other');

        // Check moves under ranks
        const rows = container.querySelectorAll('.print-sheet__learnset-row');
        expect(rows).toHaveLength(2);

        const starterPills = Array.from(rows[0].querySelectorAll('.print-sheet__learnset-pill')).map(
            (p) => p.textContent?.trim()
        );
        expect(starterPills).toEqual(['Tackle', 'Tail Whip']);

        const rookiePills = Array.from(rows[1].querySelectorAll('.print-sheet__learnset-pill')).map(
            (p) => p.textContent?.trim()
        );
        expect(rookiePills).toEqual(['Quick Attack']);
    });

    it('highlights currently equipped moves from moves array with checkmark and learned styling', async () => {
        const learnset = [
            { Learned: 'Starter', Name: 'Thunderbolt' },
            { Learned: 'Starter', Name: 'Thunder Shock' },
            { Learned: 'Rookie', Name: 'Iron Tail' }
        ];

        // Currently learned / equipped moves on character
        const currentMoves: MoveData[] = [
            mockMove('Thunder Shock'),
            mockMove('Iron Tail')
        ];

        await act(async () => {
            root.render(
                <PrintLearnset
                    learnset={learnset}
                    moves={currentMoves}
                    config={{ ...basePrintConfig, showLearnset: true }}
                />
            );
        });

        // Thunderbolt is NOT learned
        const thunderboltPill = Array.from(container.querySelectorAll('.print-sheet__learnset-pill')).find(
            (el) => el.textContent?.includes('Thunderbolt')
        );
        expect(thunderboltPill).toBeDefined();
        expect(thunderboltPill?.classList.contains('print-sheet__learnset-pill--learned')).toBe(false);
        expect(thunderboltPill?.textContent).toBe('Thunderbolt');
        expect(thunderboltPill?.querySelector('strong')).toBeNull();

        // Thunder Shock IS learned
        const thundershockPill = Array.from(container.querySelectorAll('.print-sheet__learnset-pill')).find(
            (el) => el.textContent?.includes('Thunder Shock')
        );
        expect(thundershockPill).toBeDefined();
        expect(thundershockPill?.classList.contains('print-sheet__learnset-pill--learned')).toBe(true);
        expect(thundershockPill?.textContent).toContain('✓ Thunder Shock');
        expect(thundershockPill?.querySelector('strong')?.textContent).toBe('✓ Thunder Shock');

        // Iron Tail IS learned (case-insensitive & whitespace tolerant)
        const ironTailPill = Array.from(container.querySelectorAll('.print-sheet__learnset-pill')).find(
            (el) => el.textContent?.includes('Iron Tail')
        );
        expect(ironTailPill).toBeDefined();
        expect(ironTailPill?.classList.contains('print-sheet__learnset-pill--learned')).toBe(true);
        expect(ironTailPill?.textContent).toContain('✓ Iron Tail');
    });
});
