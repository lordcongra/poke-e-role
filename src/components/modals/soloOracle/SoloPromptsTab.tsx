import { useState } from 'react';
import { Sparkles, Dices, Compass, CloudRain, Megaphone, Castle } from 'lucide-react';
import {
    rollEventFocus,
    rollActionThemeCombo,
    rollPokemonPrompt,
    broadcastPromptRoll,
    type PromptCategory
} from '@/utils/solo/oracleUtils';

interface PromptDisplay {
    category: string;
    title: string;
    body: string;
    roll: number;
    description?: string;
}

interface SoloPromptsTabProps {
    onLogPrompt?: (prompt: { label: string; result: string; details?: string; roll: number }) => void;
}

export function SoloPromptsTab({ onLogPrompt }: SoloPromptsTabProps) {
    const [latestPrompt, setLatestPrompt] = useState<PromptDisplay | null>(null);

    const handleRollEventFocus = async () => {
        const { roll, entry } = rollEventFocus();
        const display: PromptDisplay = {
            category: 'Event Focus',
            title: entry.name,
            body: entry.description,
            roll
        };
        setLatestPrompt(display);
        await broadcastPromptRoll('Event Focus', entry.name, `d100: ${roll} - ${entry.description}`);
        onLogPrompt?.({
            label: 'Event Focus',
            result: entry.name,
            details: `d100: ${roll} - ${entry.description}`,
            roll
        });
    };

    const handleRollActionTheme = async () => {
        const { actionRoll, themeRoll, actionWord, themeWord, text } = rollActionThemeCombo();
        const display: PromptDisplay = {
            category: 'Action & Theme',
            title: text,
            body: `Action: ${actionWord} (d100: ${actionRoll}) | Theme: ${themeWord} (d100: ${themeRoll})`,
            roll: actionRoll,
            description: 'Interpret this pair metaphorically to add narrative texture or reveal what an NPC wants.'
        };
        setLatestPrompt(display);
        await broadcastPromptRoll('Action & Theme', text, `Action: ${actionWord}, Theme: ${themeWord}`);
        onLogPrompt?.({
            label: 'Action & Theme',
            result: text,
            details: `Action: ${actionWord} (d100: ${actionRoll}) | Theme: ${themeWord} (d100: ${themeRoll})`,
            roll: actionRoll
        });
    };

    const handleRollPokemonPrompt = async (cat: PromptCategory) => {
        const result = rollPokemonPrompt(cat);
        const display: PromptDisplay = {
            category: result.label,
            title: result.text,
            body: `Category: ${result.label}`,
            roll: result.roll
        };
        setLatestPrompt(display);
        await broadcastPromptRoll(result.label, result.text, `d20: ${result.roll}`);
        onLogPrompt?.({
            label: result.label,
            result: result.text,
            details: `d20: ${result.roll}`,
            roll: result.roll
        });
    };

    return (
        <div className="solo-prompts-tab">
            {/* Event Focus & Meaning Section */}
            <div className="solo-prompts__section">
                <h4 className="solo-prompts__section-title">
                    <Sparkles size={16} /> Mythic Event Focus & Meaning Generator
                </h4>
                <div className="solo-prompts__buttons-grid">
                    <button
                        type="button"
                        className="action-button action-button--primary"
                        onClick={handleRollEventFocus}
                    >
                        <Sparkles size={14} /> Roll Event Focus (d100)
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--primary"
                        onClick={handleRollActionTheme}
                    >
                        <Dices size={14} /> Roll Action + Theme
                    </button>
                </div>
            </div>

            {/* Pokémon Prompt Tables */}
            <div className="solo-prompts__section">
                <h4 className="solo-prompts__section-title">
                    <Compass size={16} /> Pokémon Adventure Prompts & Twists
                </h4>
                <div className="solo-prompts__buttons-grid">
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => handleRollPokemonPrompt('disposition')}
                        title="Wild Pokémon behavior, mood, and intent"
                    >
                        <Compass size={14} /> Wild PKMN Disposition
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => handleRollPokemonPrompt('twist')}
                        title="Unexpected encounter twists and hidden factors"
                    >
                        <Sparkles size={14} /> Encounter Twist
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => handleRollPokemonPrompt('hazard')}
                        title="Environmental hazards, weather, and terrain traps"
                    >
                        <CloudRain size={14} /> Wilderness Hazard
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => handleRollPokemonPrompt('rumor')}
                        title="Town rumors, Gym Leader hooks, and mysteries"
                    >
                        <Megaphone size={14} /> Settlement Rumor
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => handleRollPokemonPrompt('ruin')}
                        title="Ancient ruin oddities, puzzles, and relics"
                    >
                        <Castle size={14} /> Ruin Anomaly
                    </button>
                </div>
            </div>

            {/* Latest Result Display */}
            {latestPrompt && (
                <div className="solo-prompts__card">
                    <div className="solo-prompts__card-header">
                        <span>{latestPrompt.category}</span>
                        <span>Roll: {latestPrompt.roll}</span>
                    </div>
                    <div className="solo-prompts__card-body">{latestPrompt.title}</div>
                    <div className="solo-prompts__card-desc">{latestPrompt.body}</div>
                    {latestPrompt.description && (
                        <div className="solo-prompts__card-desc" style={{ fontStyle: 'italic' }}>
                            {latestPrompt.description}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
