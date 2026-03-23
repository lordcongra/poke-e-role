import OBR from "@owlbear-rodeo/sdk";
import type { Move } from '../../@types/index';
import { appState, syncDerivedStats } from '../../state';
import { saveBatchDataToToken } from '../../obr';
import { sheetView } from '../../view';
import { COMBAT_STATS, SOCIAL_STATS, ALL_SKILLS, generateId } from '../../utils';
import { fetchMoveData } from '../../api';
import { calculateStats } from '../../math';
import { reRenderMoves } from '../../sync';
import { updateHealthBars } from '../../listeners/uiListeners';
import { ATTRIBUTE_MAPPING } from '../../@types/index';
import { createEl } from '../dom';

import { genState } from './shared';
import { generateWildBuild } from './wild';
import { generateMinMaxBuild } from './minmax'; 
import { generateAverageBuild } from './average';

// DATA SANITIZERS
function normalizeStat(val: string): string {
    const s = val.toLowerCase();
    if (s.includes('str')) return 'str';
    if (s.includes('dex')) return 'dex';
    if (s.includes('vit')) return 'vit';
    if (s.includes('spe')) return 'spe';
    if (s.includes('ins')) return 'ins';
    if (s.includes('tou')) return 'tou';
    if (s.includes('coo')) return 'coo';
    if (s.includes('bea')) return 'bea';
    if (s.includes('cut')) return 'cut';
    if (s.includes('cle')) return 'cle';
    return '';
}

function normalizeSkill(val: string): string {
    const s = val.toLowerCase();
    for (const sk of ALL_SKILLS) {
        if (s.includes(sk)) return sk;
    }
    return 'brawl';
}

export function setupGeneratorListeners() {
    const buildBtn = document.getElementById('auto-build-btn');
    const genModal = document.getElementById('generator-modal');
    const genCancel = document.getElementById('generator-cancel-btn');
    const genConfirm = document.getElementById('generator-confirm-btn');

    const prevModal = document.getElementById('generator-preview-modal');
    const prevCancel = document.getElementById('preview-cancel-btn');
    const prevReroll = document.getElementById('preview-reroll-btn');
    const prevApply = document.getElementById('preview-apply-btn');

    buildBtn?.addEventListener('click', () => {
        const species = sheetView.identity.species.value;
        if (!species) {
            OBR.notification.show("Please select a Species first!");
            return;
        }
        if (genModal) genModal.style.display = 'flex';
    });

    genCancel?.addEventListener('click', () => {
        if (genModal) genModal.style.display = 'none';
    });

    genConfirm?.addEventListener('click', async () => {
        if (genModal) genModal.style.display = 'none';
        await routeGeneratorRequest();
    });

    prevCancel?.addEventListener('click', () => {
        if (prevModal) prevModal.style.display = 'none';
        genState.currentTempBuild = null;
        if (buildBtn) { (buildBtn as HTMLButtonElement).disabled = false; buildBtn.innerText = "🎲"; }
    });

    prevReroll?.addEventListener('click', async () => {
        await routeGeneratorRequest();
    });

    prevApply?.addEventListener('click', async () => {
        if (prevModal) prevModal.style.display = 'none';
        await applyBuildData();
    });
}

async function routeGeneratorRequest() {
    const speciesName = sheetView.identity.species.value;
    const buildType = (document.getElementById('generator-type') as HTMLSelectElement)?.value || 'wild';

    const buildBtn = document.getElementById('auto-build-btn') as HTMLButtonElement;
    if (buildBtn) { buildBtn.disabled = true; buildBtn.innerText = "⏳"; }
    OBR.notification.show(`🎲 Calculating ${speciesName} build...`);

    if (buildType === 'wild') {
        genState.currentTempBuild = await generateWildBuild();
    } else if (buildType === 'minmax') {
        genState.currentTempBuild = await generateMinMaxBuild(); 
    } else if (buildType === 'average') {
        genState.currentTempBuild = await generateAverageBuild();
    }

    if (genState.currentTempBuild) {
        renderPreviewModal();
    } else {
        if (buildBtn) { buildBtn.disabled = false; buildBtn.innerText = "🎲"; }
        OBR.notification.show(`❌ Failed to generate build for ${speciesName}.`, "ERROR");
    }
}

function updateDicePreviews() {
    const badges = document.querySelectorAll('.preview-dice-badge');
    badges.forEach(badge => {
        const attr = badge.getAttribute('data-attr');
        const skill = badge.getAttribute('data-skill');
        const dmgStat = badge.getAttribute('data-dmgstat');
        const power = parseInt(badge.getAttribute('data-power') || '0');

        let accTotal = 0;
        if (attr && skill) {
            const isSoc = ['tou', 'coo', 'bea', 'cut', 'cle'].includes(attr);
            const prefix = isSoc ? 'prev-soc-' : 'prev-attr-';
            const baseAttr = parseInt((document.getElementById(`${attr}-base`) as HTMLInputElement)?.value) || 1;
            const genAttr = parseInt((document.getElementById(`${prefix}${attr}`) as HTMLInputElement)?.value) || 0;
            
            const baseSkillInput = document.getElementById(`${skill}-base`) as HTMLInputElement;
            const baseSkill = baseSkillInput ? parseInt(baseSkillInput.value) || 0 : 0;
            const genSkill = parseInt((document.getElementById(`prev-skill-${skill}`) as HTMLInputElement)?.value) || 0;
            
            accTotal = baseAttr + genAttr + baseSkill + genSkill;
            const accSpan = badge.querySelector('.acc-badge');
            if (accSpan) accSpan.innerHTML = `A:${accTotal}`;
        }

        if (dmgStat) {
            const isDmgSoc = ['tou', 'coo', 'bea', 'cut', 'cle'].includes(dmgStat);
            const dmgPrefix = isDmgSoc ? 'prev-soc-' : 'prev-attr-';
            const baseDmgAttr = parseInt((document.getElementById(`${dmgStat}-base`) as HTMLInputElement)?.value) || 1;
            const genDmgAttr = parseInt((document.getElementById(`${dmgPrefix}${dmgStat}`) as HTMLInputElement)?.value) || 0;
            const dmgTotal = baseDmgAttr + genDmgAttr + power;
            
            const dmgSpan = badge.querySelector('.dmg-badge');
            if (dmgSpan) dmgSpan.innerHTML = `D:${dmgTotal}`;
        }
    });
}

function buildSpinner(id: string, initialVal: number): HTMLDivElement {
    const minusBtn = createEl('button', { type: 'button', className: 'prev-spin-btn', innerText: '-', style: 'background:var(--panel-bg); border:none; border-right:1px solid var(--border); color:var(--text-main); padding: 2px 6px; cursor:pointer;' });
    const input = createEl('input', { type: 'number', id: id, className: 'no-spinners prev-spin-input', value: initialVal, min: 0, style: 'width: 24px; text-align: center; border: none; background: transparent; color: var(--text-main); padding: 2px 0;' });
    const plusBtn = createEl('button', { type: 'button', className: 'prev-spin-btn', innerText: '+', style: 'background:var(--panel-bg); border:none; border-left:1px solid var(--border); color:var(--text-main); padding: 2px 6px; cursor:pointer;' });

    minusBtn.onclick = () => {
        let val = parseInt(input.value) || 0;
        if (val > 0) {
            input.value = (val - 1).toString();
            updateDicePreviews();
        }
    };

    plusBtn.onclick = () => {
        let val = parseInt(input.value) || 0;
        input.value = (val + 1).toString();
        updateDicePreviews();
    };

    input.oninput = () => updateDicePreviews();

    return createEl('div', { style: 'display: flex; align-items: center; border: 1px solid var(--border); border-radius: 3px; background: var(--input-bg);' }, [minusBtn, input, plusBtn]) as HTMLDivElement;
}

function renderPreviewModal() {
    const content = document.getElementById('preview-content');
    const prevModal = document.getElementById('generator-preview-modal');
    if (!content || !prevModal || !genState.currentTempBuild) return;

    const build = genState.currentTempBuild;
    const includePmd = (document.getElementById('generator-include-pmd') as HTMLInputElement)?.checked;
    const includeCustom = (document.getElementById('generator-include-custom') as HTMLInputElement)?.checked;

    content.replaceChildren(); 

    const attrGrid = createEl('div', { style: 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;' });
    COMBAT_STATS.forEach(stat => {
        const col = createEl('div', { style: 'display: flex; flex-direction: column; align-items: center;' }, [
            createEl('label', { style: 'font-size: 0.7rem; font-weight: bold; margin-bottom: 2px;', innerText: stat.toUpperCase() }),
            buildSpinner(`prev-attr-${stat}`, build.attr[stat] || 0)
        ]);
        attrGrid.appendChild(col);
    });
    const attrBlock = createEl('div', { style: 'background: var(--panel-alt); padding: 8px; border-radius: 4px; border: 1px solid var(--border);' }, [
        createEl('div', { style: 'font-weight: bold; margin-bottom: 4px; color: var(--primary);', innerText: 'Attributes (Rank Added)' }),
        attrGrid
    ]);
    content.appendChild(attrBlock);

    const socGrid = createEl('div', { style: 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;' });
    SOCIAL_STATS.forEach(stat => {
        const col = createEl('div', { style: 'display: flex; flex-direction: column; align-items: center;' }, [
            createEl('label', { style: 'font-size: 0.7rem; font-weight: bold; margin-bottom: 2px;', innerText: stat.toUpperCase() }),
            buildSpinner(`prev-soc-${stat}`, build.soc[stat] || 0)
        ]);
        socGrid.appendChild(col);
    });
    const socBlock = createEl('div', { style: 'background: var(--panel-alt); padding: 8px; border-radius: 4px; border: 1px solid var(--border);' }, [
        createEl('div', { style: 'font-weight: bold; margin-bottom: 4px; color: var(--primary);', innerText: 'Socials (Rank Added)' }),
        socGrid
    ]);
    content.appendChild(socBlock);

    const buildSkillCol = (title: string, skills: string[]) => {
        const col = createEl('div', { style: 'display: flex; flex-direction: column; gap: 6px;' }, [
            createEl('div', { style: 'font-size:0.7rem; font-weight:bold; color:var(--text-muted); border-bottom:1px solid var(--border); padding-bottom:2px; margin-bottom:2px;', innerText: title })
        ]);
        skills.forEach(sk => {
            const niceName = build.customSkillMap[sk] || (sk.charAt(0).toUpperCase() + sk.slice(1));
            const row = createEl('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 4px;' }, [
                createEl('label', { style: 'font-size: 0.7rem; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60px;', title: niceName, innerText: niceName }),
                buildSpinner(`prev-skill-${sk}`, build.skills[sk] || 0)
            ]);
            col.appendChild(row);
        });
        return col;
    };

    const skillGrid = createEl('div', { style: 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;' });
    skillGrid.appendChild(buildSkillCol('FIGHT', ['brawl', 'channel', 'clash', 'evasion']));
    skillGrid.appendChild(buildSkillCol('SURVIVE', ['alert', 'athletic', 'nature', 'stealth']));
    skillGrid.appendChild(buildSkillCol('SOCIAL', ['charm', 'etiquette', 'intimidate', 'perform']));
    if (includePmd) skillGrid.appendChild(buildSkillCol('KNOW (PMD)', ['crafts', 'lore', 'medicine', 'magic']));
    
    if (includeCustom) {
        appState.currentExtraCategories.forEach(cat => {
            const catSkills = cat.skills.map(sk => sk.id);
            if (catSkills.length > 0) skillGrid.appendChild(buildSkillCol(cat.name.toUpperCase(), catSkills));
        });
    }
    const skillBlock = createEl('div', { style: 'background: var(--panel-alt); padding: 8px; border-radius: 4px; border: 1px solid var(--border);' }, [
        createEl('div', { style: 'font-weight: bold; margin-bottom: 4px; color: var(--primary);', innerText: 'Skills' }),
        skillGrid
    ]);
    content.appendChild(skillBlock);

    const movesGrid = createEl('div', { id: 'prev-moves-container', style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 6px;' });
    for (let i = 0; i < build.maxMoves; i++) {
        const move = build.moves[i];
        const moveName = move ? move.name : "";

        const slot = createEl('div', { style: 'display: flex; align-items: center; background: var(--input-bg); border: 1px solid var(--border); border-radius: 3px; padding-right: 4px;' });
        const input = createEl('input', { type: 'text', className: 'prev-move-input', value: moveName, list: 'move-list', placeholder: '-- Empty Slot --', style: 'flex: 1; min-width: 0; padding: 4px; border: none; background: transparent; color: var(--text-main); font-size: 0.8rem; box-sizing: border-box; outline: none;' });
        slot.appendChild(input);

        if (move) {
            const accBadge = createEl('span', { className: 'acc-badge', title: 'Accuracy Dice Pool (Attr + Skill)', innerText: 'A:-' });
            const dmgBadge = createEl('span', { className: 'dmg-badge', title: 'Damage Dice Pool (Stat + Power)', innerText: 'D:-' });
            const badgeContainer = createEl('div', {
                className: 'preview-dice-badge',
                dataset: { attr: move.attr, skill: move.skill, dmgstat: move.dmgStat, power: String(move.power) },
                style: 'font-size: 0.65rem; color: var(--text-muted); display: flex; gap: 4px; padding: 0 4px; border-right: 1px solid var(--border); font-family: monospace; white-space: nowrap;'
            }, [accBadge, dmgBadge]);

            const infoBtn = createEl('button', {
                type: 'button',
                className: 'info-trigger',
                innerText: '?',
                style: 'border:none; outline:none; background:none; color:var(--primary); font-weight:bold; cursor:pointer; padding:0 4px; font-size:1.1rem;'
            });

            const safeName = move.name;
            const safeDescText = `Type: ${move.type} | Category: ${move.cat} | Power: ${move.power}\nAccuracy: ${move.attr.toUpperCase()} + ${move.skill.charAt(0).toUpperCase() + move.skill.slice(1)}\nDamage: ${move.dmgStat ? move.dmgStat.toUpperCase() : 'N/A'}\n\n${move.desc}`;

            infoBtn.onclick = () => {
                const titleEl = document.getElementById('info-modal-title');
                const descEl = document.getElementById('info-modal-desc');
                const modalEl = document.getElementById('info-modal');
                if (titleEl && descEl && modalEl) {
                    titleEl.innerText = safeName;
                    descEl.innerText = safeDescText;
                    modalEl.style.display = 'flex';
                }
            };

            slot.appendChild(badgeContainer);
            slot.appendChild(infoBtn);
        }

        movesGrid.appendChild(slot);
    }

    const movesBlock = createEl('div', { style: 'background: var(--panel-alt); padding: 8px; border-radius: 4px; border: 1px solid var(--border);' }, [
        createEl('div', { style: 'font-weight: bold; margin-bottom: 4px; color: var(--primary);', innerText: `Moves (Max: ${build.maxMoves})` }),
        movesGrid
    ]);
    content.appendChild(movesBlock);

    prevModal.style.display = 'flex';
    updateDicePreviews(); 
}

async function applyBuildData() {
    if (!genState.currentTempBuild) return;
    const buildBtn = document.getElementById('auto-build-btn') as HTMLButtonElement;
    
    OBR.notification.show(`💾 Applying ${genState.currentTempBuild.species} Build...`);

    const batchUpdates: Record<string, unknown> = {};

    COMBAT_STATS.forEach(stat => {
        const val = parseInt((document.getElementById(`prev-attr-${stat}`) as HTMLInputElement)?.value) || 0;
        sheetView.stats[stat].rank.value = val.toString();
        batchUpdates[`${stat}-rank`] = val;
    });

    SOCIAL_STATS.forEach(stat => {
        const val = parseInt((document.getElementById(`prev-soc-${stat}`) as HTMLInputElement)?.value) || 0;
        sheetView.stats[stat].rank.value = val.toString();
        batchUpdates[`${stat}-rank`] = val;
    });

    ALL_SKILLS.forEach(sk => {
        const el = document.getElementById(`prev-skill-${sk}`) as HTMLInputElement;
        const val = el ? (parseInt(el.value) || 0) : 0; 
        sheetView.skills[sk].base.value = val.toString();
        batchUpdates[`${sk}-base`] = val;
    });

    genState.currentTempBuild.customSkillsList.forEach(skId => {
        const el = document.getElementById(`prev-skill-${skId}`) as HTMLInputElement;
        const val = el ? (parseInt(el.value) || 0) : 0;
        const realInput = document.getElementById(`${skId}-base`) as HTMLInputElement;
        if (realInput) realInput.value = val.toString();
        batchUpdates[`${skId}-base`] = val;
    });

    const moveInputs = document.querySelectorAll('.prev-move-input') as NodeListOf<HTMLInputElement>;
    const finalMoves: string[] = [];
    moveInputs.forEach(input => {
        if (input.value.trim()) finalMoves.push(input.value.trim());
    });

    const applyMovePromises = finalMoves.map(async (mName) => {
        const cached = genState.currentTempBuild!.moves.find(m => m.name.toLowerCase() === mName.toLowerCase());
        if (cached) return { ...cached, id: generateId() }; 

        const moveData = await fetchMoveData(mName.trim());
        const newMove: Record<string, unknown> = {
            id: generateId(), name: mName, attr: 'str', skill: 'brawl',
            type: 'Normal', cat: 'Phys', dmgStat: '', power: 0, desc: ''
        };
        if (moveData) {
            newMove.type = String(moveData.Type || "Normal");
            let rawCat = String(moveData.Category || "Physical");
            newMove.cat = rawCat === "Physical" ? "Phys" : (rawCat === "Special" ? "Spec" : "Supp");
            newMove.power = Number(moveData.Power) || 0;
            newMove.desc = String(moveData.Effect || moveData.Description || "");
            
            const rawDmg = String(moveData.Damage1 === "None" ? "" : (moveData.Damage1 || ""));
            const accuracyOne = String(moveData.Accuracy1 || "");
            const accuracyTwo = String(moveData.Accuracy2 || "");

            newMove.dmgStat = normalizeStat(ATTRIBUTE_MAPPING[rawDmg] || rawDmg);
            newMove.attr = normalizeStat(ATTRIBUTE_MAPPING[accuracyOne] || accuracyOne) || 'str';
            newMove.skill = normalizeSkill(accuracyTwo);
        }
        return newMove;
    });

    const resolvedMoves = await Promise.all(applyMovePromises);
    
    // FIX: Safely cast the resolved array back to the expected Move[] interface format.
    appState.currentMoves = resolvedMoves as unknown as Move[];
    batchUpdates['moves-data'] = JSON.stringify(appState.currentMoves);

    Object.assign(appState.currentTokenData, batchUpdates);
    saveBatchDataToToken(batchUpdates);
    
    genState.currentTempBuild = null;
    
    reRenderMoves();
    calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
    syncDerivedStats();
    updateHealthBars();

    if (buildBtn) { buildBtn.disabled = false; buildBtn.innerText = "🎲"; }
    OBR.notification.show(`✅ Build applied successfully!`);
}