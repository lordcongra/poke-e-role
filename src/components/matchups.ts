import { calculateMatchups } from '../utils';
import { createEl, getTypeStyle } from './dom';
import { appState } from '../state';

export function renderTypeMatchups(typeStr: string) {
    const container = document.getElementById('type-matchup-container');
    const lockedContainer = document.getElementById('locked-type-matchup-container');
    
    if (!container) return;
    
    container.innerHTML = '';
    if (lockedContainer) lockedContainer.innerHTML = '';

    if (!typeStr) {
        const emptyMsg = createEl('div', { style: 'color: #888; font-style: italic; text-align: center; padding-top: 10px;' }, ["Load a Pokémon to see matchups..."]);
        container.appendChild(emptyMsg);
        if (lockedContainer) lockedContainer.appendChild(emptyMsg.cloneNode(true));
        return;
    }

    // Now safely passes the live inventory into the calculation engine!
    const matchups = calculateMatchups(typeStr, appState.currentInventory);
    const groups: Record<number, string[]> = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };

    for (const [type, mult] of Object.entries(matchups)) {
        if (groups[mult]) groups[mult].push(type);
    }

    const buildGroup = (label: string, mult: number) => {
        if (groups[mult].length === 0) return;
        
        const groupDiv = createEl('div', { style: 'display: flex; gap: 8px; align-items: flex-start; margin-bottom: 6px;' });
        const labelSpan = createEl('span', { innerText: label, style: 'width: 40px; font-weight: bold; color: var(--text-main); text-align: right; flex-shrink: 0; padding-top: 2px;' });
        const badgesContainer = createEl('div', { style: 'display: flex; gap: 4px; flex-wrap: wrap; flex: 1;' });
        
        groups[mult].forEach(t => {
            const badge = createEl('div', { innerText: t, style: getTypeStyle(t) + ' padding: 2px 6px; font-size: 0.75rem; border-radius: 4px;' });
            badgesContainer.appendChild(badge);
        });

        groupDiv.appendChild(labelSpan);
        groupDiv.appendChild(badgesContainer);
        container.appendChild(groupDiv);
    }

    buildGroup('4x', 4);
    buildGroup('2x', 2);
    buildGroup('0.5x', 0.5);
    buildGroup('0.25x', 0.25);
    buildGroup('0x', 0);
    
    if (lockedContainer) {
        lockedContainer.innerHTML = container.innerHTML;
    }
}