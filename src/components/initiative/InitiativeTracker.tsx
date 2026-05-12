import { useEffect, useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Image } from '@owlbear-rodeo/sdk';
import './InitiativeTracker.css';

interface Combatant {
    id: string;
    name: string;
    image: string;
    initiative: number;
}

export function InitiativeTracker() {
    const [combatants, setCombatants] = useState<Combatant[]>([]);
    const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
    const [theme, setTheme] = useState('light');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setLayout((params.get('layout') as 'vertical' | 'horizontal') || 'vertical');
        setTheme(params.get('theme') || 'light');
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [theme]);

    useEffect(() => {
        if (!OBR.isAvailable) return;
        const updateCombatants = async () => {
            const items = await OBR.scene.items.getItems(
                (item) => item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] !== undefined
            );
            const parsed = items.map((item) => {
                const meta = item.metadata['pokerole-pmd-extension/initiative'] as { value: number };
                const imgItem = item as Image;
                return {
                    id: item.id,
                    name: item.name,
                    image: imgItem.image?.url || '',
                    initiative: meta.value || 0
                };
            });
            parsed.sort((a, b) => b.initiative - a.initiative);
            setCombatants(parsed);
        };

        updateCombatants();
        return OBR.scene.items.onChange(updateCombatants);
    }, []);

    // ✨ The dynamic resizer! Ensures the frame wraps our content perfectly.
    useEffect(() => {
        if (containerRef.current && OBR.isAvailable) {
            const rect = containerRef.current.getBoundingClientRect();
            // Add a tiny bit of padding to prevent scrollbar pop-in jitter on some browsers
            OBR.popover.setWidth('pkr-initiative-tracker', rect.width + 4);
            OBR.popover.setHeight('pkr-initiative-tracker', rect.height + 4);
        }
    }, [combatants, layout]);

    const updateInit = async (id: string, newVal: number) => {
        if (isNaN(newVal)) return;
        await OBR.scene.items.updateItems([id], (items) => {
            for (const item of items) {
                item.metadata['pokerole-pmd-extension/initiative'] = { value: newVal };
            }
        });
    };

    const removeInit = async (id: string) => {
        await OBR.scene.items.updateItems([id], (items) => {
            for (const item of items) {
                delete item.metadata['pokerole-pmd-extension/initiative'];
                delete item.metadata['com.pretty-initiative/metadata'];
            }
        });
    };

    if (combatants.length === 0) return null;

    return (
        <div ref={containerRef} className={`init-tracker init-tracker--${layout}`}>
            <div className="init-tracker__header">
                <span className="init-tracker__title">⚔️ INITIATIVE</span>
                <button
                    type="button"
                    className="init-tracker__close"
                    onClick={() => OBR.popover.close('pkr-initiative-tracker')}
                >
                    ✖
                </button>
            </div>
            <div className={`init-tracker__list init-tracker__list--${layout}`}>
                {combatants.map((c) => (
                    <div key={c.id} className="init-tracker__card">
                        {c.image && <img src={c.image} alt={c.name} className="init-tracker__avatar" />}
                        <div className="init-tracker__info">
                            <span className="init-tracker__name">{c.name}</span>
                            <input
                                type="number"
                                step="0.01"
                                value={parseFloat(c.initiative.toFixed(2))}
                                onChange={(e) => updateInit(c.id, parseFloat(e.target.value))}
                                className="init-tracker__input no-spinners"
                            />
                        </div>
                        <button type="button" className="init-tracker__remove" onClick={() => removeInit(c.id)}>
                            🗑️
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
