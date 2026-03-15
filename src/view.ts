import { COMBAT_STATS, SOCIAL_STATS, ALL_SKILLS } from './utils';

const getInputElement = (id: string) => document.getElementById(id) as HTMLInputElement;
const getSelectElement = (id: string) => document.getElementById(id) as HTMLSelectElement;
const getHTMLElement = (id: string) => document.getElementById(id) as HTMLElement;

class CharacterSheetView {
    identity = {
        nickname: getInputElement('nickname'),
        species: getInputElement('species'),
        nature: getInputElement('nature'),
        rank: getSelectElement('rank'),
        typing: getInputElement('typing'),
        ability: getInputElement('ability'),
        sheetType: getSelectElement('sheet-type'),
        age: getSelectElement('age'),
        roomRuleset: getSelectElement('room-ruleset-style'),
        roomPain: getSelectElement('room-pain-penalties'),
        combatItem: getInputElement('combat-item'),
        socialItem: getInputElement('social-item'),
        handItem: getInputElement('hand-item'),
        rollTarget: getSelectElement('roll-target')
    };

    health = {
        hp: { base: getInputElement('hp-base'), curr: getInputElement('hp-curr'), max: getHTMLElement('hp-max-display') },
        will: { base: getInputElement('will-base'), curr: getInputElement('will-curr'), max: getHTMLElement('will-max-display') }
    };

    defenses = {
        def: { buff: getInputElement('def-buff'), debuff: getInputElement('def-debuff'), total: getHTMLElement('def-total') },
        spd: { buff: getInputElement('spd-buff'), debuff: getInputElement('spd-debuff'), total: getHTMLElement('spd-total') },
        evasion: { total: getHTMLElement('evasion-derived') },
        clashP: { total: getHTMLElement('clash-p-derived') },
        clashS: { total: getHTMLElement('clash-s-derived') }
    };

    initiative = { total: getHTMLElement('init-total') };

    trackers = {
        showTrackers: getInputElement('show-trackers'),
        actions: getInputElement('actions-used'),
        evade: getInputElement('evasions-used'),
        clash: getInputElement('clashes-used'),
        chances: getInputElement('chances-used'), 
        fate: getInputElement('fate-used'),
        happiness: getInputElement('happiness-curr'), 
        loyalty: getInputElement('loyalty-curr')      
    };

    globalMods = {
        acc: getInputElement('global-acc-mod'),
        dmg: getInputElement('global-dmg-mod'),
        succ: getInputElement('global-succ-mod'),
        chance: getInputElement('global-chance-mod'),
        ignoredPain: getInputElement('ignored-pain-mod')
    };

    points = {
        attr: { remaining: getHTMLElement('attr-remaining-display'), extra: getInputElement('extra-attr-points') },
        soc: { remaining: getHTMLElement('soc-remaining-display'), extra: getInputElement('extra-soc-points') },
        skill: { remaining: getHTMLElement('skill-remaining-display'), extra: getInputElement('extra-skill-points'), limit: getHTMLElement('skill-limit-display') }
    };

    stats: Record<string, { base: HTMLInputElement, limit: HTMLElement | null, rank: HTMLInputElement, buff: HTMLInputElement, debuff: HTMLInputElement, total: HTMLElement }> = {};
    skills: Record<string, { label: HTMLInputElement, base: HTMLInputElement, buff: HTMLInputElement, total: HTMLElement }> = {};

    constructor() {
        [...COMBAT_STATS, ...SOCIAL_STATS].forEach(stat => {
            this.stats[stat] = {
                base: getInputElement(`${stat}-base`),
                limit: document.getElementById(`${stat}-limit-display`), 
                rank: getInputElement(`${stat}-rank`),
                buff: getInputElement(`${stat}-buff`),
                debuff: getInputElement(`${stat}-debuff`),
                total: getHTMLElement(`${stat}-total`)
            };
        });

        ALL_SKILLS.forEach(skill => {
            this.skills[skill] = {
                label: getInputElement(`label-${skill}`),
                base: getInputElement(`${skill}-base`),
                buff: getInputElement(`${skill}-buff`),
                total: getHTMLElement(`${skill}-total`)
            };
        });
    }
}

export const sheetView = new CharacterSheetView();