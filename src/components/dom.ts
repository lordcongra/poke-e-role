export const TYPE_COLORS: Record<string, string> = {
    "Normal": "#A8A878", "Fire": "#F08030", "Water": "#6890F0",
    "Electric": "#F8D030", "Grass": "#78C850", "Ice": "#98D8D8",
    "Fighting": "#C03028", "Poison": "#A040A0", "Ground": "#E0C068",
    "Flying": "#A890F0", "Psychic": "#F85888", "Bug": "#A8B820",
    "Rock": "#B8A038", "Ghost": "#705898", "Dragon": "#7038F8",
    "Dark": "#705848", "Steel": "#B8B8D0", "Fairy": "#EE99AC"
};

export function getTypeStyle(typeStr: string): string {
    if (!typeStr || typeStr === "None") return `background: transparent;`;
    const types = typeStr.split('/').map((t: string) => t.trim());
    if (types.length === 1 && TYPE_COLORS[types[0]]) {
        return `background: ${TYPE_COLORS[types[0]]}; color: white; text-shadow: 1px 1px 1px rgba(0,0,0,0.8); border-radius: 4px; text-align: center; font-weight: bold;`;
    } else if (types.length === 2 && TYPE_COLORS[types[0]] && TYPE_COLORS[types[1]]) {
        return `background: linear-gradient(90deg, ${TYPE_COLORS[types[0]]} 50%, ${TYPE_COLORS[types[1]]} 50%); color: white; text-shadow: 1px 1px 1px rgba(0,0,0,0.8); border-radius: 4px; text-align: center; font-weight: bold;`;
    }
    return `background: transparent;`;
}

export function applyTypeStyle(element: HTMLElement | null, typeStr: string) {
    if (!element) return;
    element.style.cssText = getTypeStyle(typeStr);
}

export function createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, any> = {},
    children: (HTMLElement | string)[] = []
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(props)) {
        if (key === 'className') el.className = val;
        else if (key === 'dataset') {
            for (const dKey in val) el.dataset[dKey] = String(val[dKey]);
        }
        else if (key === 'style') el.style.cssText = val;
        else if (key === 'list') el.setAttribute('list', val); 
        else (el as any)[key] = val;
    }
    children.forEach(c => {
        if (typeof c === 'string') el.appendChild(document.createTextNode(c));
        else el.appendChild(c);
    });
    return el;
}

export function setupSpinners() {
  document.querySelectorAll('input[type="number"].number-spinner__input').forEach(input => {
    if (input.parentElement?.classList.contains('number-spinner')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'number-spinner';
    input.parentNode?.insertBefore(wrapper, input);
    
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'number-spinner__button';
    minus.innerText = '-';
    minus.onclick = () => { 
        (input as HTMLInputElement).stepDown(); 
        input.dispatchEvent(new Event('input', { bubbles: true })); 
        input.dispatchEvent(new Event('change', { bubbles: true })); 
    };
    
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'number-spinner__button';
    plus.innerText = '+';
    plus.onclick = () => { 
        (input as HTMLInputElement).stepUp(); 
        input.dispatchEvent(new Event('input', { bubbles: true })); 
        input.dispatchEvent(new Event('change', { bubbles: true })); 
    };
    
    wrapper.appendChild(minus);
    wrapper.appendChild(input);
    wrapper.appendChild(plus);
  });
}

export function updateSheetTypeUI(val: string) {
    const speRow = document.getElementById('spe-row');
    const clashPRow = document.getElementById('clash-p-row');
    const clashSRow = document.getElementById('clash-s-row');
    const knowledgeHeader = document.getElementById('knowledge-header');
    
    const happyBox = document.getElementById('happiness-box');
    const loyalBox = document.getElementById('loyalty-box');
    const typeMatchupPanel = document.getElementById('type-matchup-panel');

    if (val === 'trainer') {
        if(speRow) speRow.style.display = 'none';
        if(clashPRow) clashPRow.style.display = 'none';
        if(clashSRow) clashSRow.style.display = 'none';
        if(happyBox) happyBox.style.display = 'none';
        if(loyalBox) loyalBox.style.display = 'none';
        if(typeMatchupPanel) typeMatchupPanel.style.display = 'none';

        (document.getElementById('label-channel') as HTMLInputElement).value = "Throw";
        (document.getElementById('label-clash') as HTMLInputElement).value = "Weapon";
        (document.getElementById('label-charm') as HTMLInputElement).value = "Empathy";
        (document.getElementById('label-magic') as HTMLInputElement).value = "Science";
        if(knowledgeHeader) knowledgeHeader.innerText = "KNOWLEDGE";

    } else {
        if(speRow) speRow.style.display = '';
        if(clashPRow) clashPRow.style.display = '';
        if(clashSRow) clashSRow.style.display = '';
        if(happyBox) happyBox.style.display = '';
        if(loyalBox) loyalBox.style.display = '';
        if(typeMatchupPanel) typeMatchupPanel.style.display = '';

        (document.getElementById('label-channel') as HTMLInputElement).value = "Channel";
        (document.getElementById('label-clash') as HTMLInputElement).value = "Clash";
        (document.getElementById('label-charm') as HTMLInputElement).value = "Charm";
        (document.getElementById('label-magic') as HTMLInputElement).value = "Magic";
        if(knowledgeHeader) knowledgeHeader.innerText = "KNOWLEDGE (PMD)";
    }
}

export function updatePainUI(sheetView: any) {
    const isEnabled = sheetView.identity.roomPain.value === 'true';
    const painBtn = document.getElementById('btn-will-pain');
    const painTracker = document.getElementById('ign-pain-tracker-container');
    
    if (painBtn) painBtn.style.display = isEnabled ? 'block' : 'none';
    if (painTracker) painTracker.style.display = isEnabled ? 'flex' : 'none';
}

export function updateInventoryUI(currentInventory: any[]) {
    const activeCount = currentInventory.filter(i => i.active).length;
    const warning = document.getElementById('multi-item-warning');
    if (warning) {
        warning.style.display = activeCount > 1 ? 'block' : 'none';
    }
}