import { fetchAbilityData } from '../api';

export function updateHealthBars() {
    setTimeout(() => {
        const hpCurr = parseInt((document.getElementById('hp-curr') as HTMLInputElement)?.value) || 0;
        const hpMax = parseInt(document.getElementById('hp-max-display')?.innerText || "1") || 1;
        const hpBar = document.getElementById('hp-bar-fill');

        if (hpBar) {
            const pct = Math.max(0, Math.min(100, (hpCurr / hpMax) * 100));
            hpBar.style.width = `${pct}%`;
            if (pct > 50) hpBar.style.backgroundColor = 'rgba(76, 175, 80, 0.9)'; // Green
            else if (pct > 20) hpBar.style.backgroundColor = 'rgba(255, 152, 0, 0.9)'; // Orange
            else hpBar.style.backgroundColor = 'rgba(244, 67, 54, 0.9)'; // Red
        }

        const willCurr = parseInt((document.getElementById('will-curr') as HTMLInputElement)?.value) || 0;
        const willMax = parseInt(document.getElementById('will-max-display')?.innerText || "1") || 1;
        const willBar = document.getElementById('will-bar-fill');

        if (willBar) {
            const pct = Math.max(0, Math.min(100, (willCurr / willMax) * 100));
            willBar.style.width = `${pct}%`;
            willBar.style.backgroundColor = 'rgba(33, 150, 243, 0.9)'; // Blue
        }
    }, 50); // Tiny delay to ensure Max HP has finished calculating first!
}

export function setupUIListeners() {
    // --- DARK MODE INIT & LISTENER ---
    const savedTheme = localStorage.getItem('pokerole-theme');
    if (savedTheme) document.body.setAttribute('data-theme', savedTheme);

    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('pokerole-theme', newTheme);
    });

    // --- TRACKER SETTINGS MODAL ---
    document.getElementById('tracker-settings-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('tracker-settings-modal');
        if (modal) modal.style.display = 'flex';
    });

    document.getElementById('tracker-settings-close')?.addEventListener('click', () => {
        const modal = document.getElementById('tracker-settings-modal');
        if (modal) modal.style.display = 'none';
    });

    // --- SMART TAGS & INFO MODAL ---
    document.getElementById('tags-guide-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('tags-modal');
        if (modal) modal.style.display = 'flex';
    });

    document.getElementById('tags-close-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('tags-modal');
        if (modal) modal.style.display = 'none';
    });

    document.getElementById('info-close-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('info-modal');
        if (modal) modal.style.display = 'none';
    });

    // GENERIC INFO COMPENDIUM BUTTONS (DYNAMIC FETCH)
    document.querySelectorAll('.info-trigger').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const button = e.currentTarget as HTMLElement;
            let title = button.getAttribute('data-title') || "Info";
            let desc = button.getAttribute('data-desc') || "No description available.";
            
            if (button.id === 'ability-info-btn') {
                const currentAbility = (document.getElementById('ability') as HTMLInputElement)?.value;
                title = currentAbility || "Ability";
                if (currentAbility) {
                    const abilityData = await fetchAbilityData(currentAbility);
                    desc = abilityData ? String(abilityData.Effect || abilityData.Description || "No description found.") : "No description found.";
                } else {
                    desc = "No ability selected.";
                }
            }
            
            const modal = document.getElementById('info-modal');
            if (modal) {
                document.getElementById('info-modal-title')!.innerText = title;
                document.getElementById('info-modal-desc')!.innerText = desc;
                modal.style.display = 'flex';
            }
        });
    });

    // --- COLLAPSIBLE PANELS (GENERIC) ---
    document.querySelectorAll('.panel-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget as HTMLButtonElement;
            const panel = button.closest('.sheet-panel') || button.closest('.tracker-section');
            if (panel) {
                const wrapper = panel.querySelector('.panel-content-wrapper') as HTMLElement;
                if (wrapper) {
                    if (wrapper.style.display === 'none') {
                        wrapper.style.display = 'block';
                        button.classList.remove('is-collapsed');
                    } else {
                        wrapper.style.display = 'none';
                        button.classList.add('is-collapsed');
                    }
                }
            }
        });
    });

    document.getElementById('toggle-learnset-btn')?.addEventListener('click', () => {
        const container = document.getElementById('learnset-container');
        const btn = document.getElementById('toggle-learnset-btn');
        if (container && btn) {
            if (container.style.display === 'none') {
                container.style.display = 'block';
                btn.innerText = "📖 Hide Learnset";
            } else {
                container.style.display = 'none';
                btn.innerText = "📖 View Learnset";
            }
        }
    });
}