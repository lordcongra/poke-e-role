import { useState } from 'react';
import { Plus, Trash2, Dices, BookOpen, Users } from 'lucide-react';
import { broadcastPromptRoll } from '@/utils/solo/oracleUtils';

interface SoloTrackerTabProps {
    threads: string[];
    characters: string[];
    onUpdateThreads: (threads: string[]) => void;
    onUpdateCharacters: (characters: string[]) => void;
}

export function SoloTrackerTab({ threads, characters, onUpdateThreads, onUpdateCharacters }: SoloTrackerTabProps) {
    const [newThreadInput, setNewThreadInput] = useState('');
    const [newCharInput, setNewCharInput] = useState('');
    const [randomPickMessage, setRandomPickMessage] = useState<string | null>(null);

    const handleAddThread = () => {
        const trimmed = newThreadInput.trim();
        if (!trimmed) return;
        onUpdateThreads([...threads, trimmed]);
        setNewThreadInput('');
    };

    const handleDeleteThread = (index: number) => {
        const updated = threads.filter((_, i) => i !== index);
        onUpdateThreads(updated);
    };

    const handleAddCharacter = () => {
        const trimmed = newCharInput.trim();
        if (!trimmed) return;
        onUpdateCharacters([...characters, trimmed]);
        setNewCharInput('');
    };

    const handleDeleteCharacter = (index: number) => {
        const updated = characters.filter((_, i) => i !== index);
        onUpdateCharacters(updated);
    };

    const handlePickRandomThread = async () => {
        if (threads.length === 0) return;
        const randomIndex = Math.floor(Math.random() * threads.length);
        const chosen = threads[randomIndex];
        setRandomPickMessage(`Selected Thread #${randomIndex + 1}: "${chosen}"`);
        await broadcastPromptRoll('Campaign Thread Chosen', chosen, `d${threads.length}: ${randomIndex + 1}`);
    };

    const handlePickRandomCharacter = async () => {
        if (characters.length === 0) return;
        const randomIndex = Math.floor(Math.random() * characters.length);
        const chosen = characters[randomIndex];
        setRandomPickMessage(`Selected Character #${randomIndex + 1}: "${chosen}"`);
        await broadcastPromptRoll('Campaign NPC Chosen', chosen, `d${characters.length}: ${randomIndex + 1}`);
    };

    return (
        <div className="solo-tracker-tab">
            {randomPickMessage && <div className="solo-tracker__highlight-box">🎲 {randomPickMessage}</div>}

            <div className="solo-tracker__columns">
                {/* Active Threads List */}
                <div className="solo-tracker__card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 className="solo-prompts__section-title">
                            <BookOpen size={16} /> Active Threads ({threads.length})
                        </h4>
                        {threads.length > 0 && (
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                onClick={handlePickRandomThread}
                                title="Pick a random thread from the list"
                            >
                                <Dices size={12} /> Random
                            </button>
                        )}
                    </div>

                    <div className="solo-tracker__input-row">
                        <input
                            type="text"
                            className="solo-tracker__input"
                            placeholder="Add thread / quest..."
                            value={newThreadInput}
                            onChange={(e) => setNewThreadInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddThread()}
                        />
                        <button
                            type="button"
                            className="action-button action-button--theme"
                            onClick={handleAddThread}
                            title="Add thread"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <ul className="solo-tracker__list">
                        {threads.map((thread, index) => (
                            <li key={`${thread}-${index}`} className="solo-tracker__item">
                                <span className="solo-tracker__item-text">
                                    <strong style={{ color: 'var(--primary)', marginRight: '6px' }}>
                                        #{index + 1}
                                    </strong>
                                    {thread}
                                </span>
                                <button
                                    type="button"
                                    className="solo-tracker__delete-btn"
                                    onClick={() => handleDeleteThread(index)}
                                    title="Delete thread"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </li>
                        ))}
                        {threads.length === 0 && (
                            <li className="text-subtext" style={{ padding: '8px', textAlign: 'center' }}>
                                No active threads. Add one above!
                            </li>
                        )}
                    </ul>
                </div>

                {/* Active Characters / NPCs List */}
                <div className="solo-tracker__card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 className="solo-prompts__section-title">
                            <Users size={16} /> Characters & NPCs ({characters.length})
                        </h4>
                        {characters.length > 0 && (
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                onClick={handlePickRandomCharacter}
                                title="Pick a random character from the list"
                            >
                                <Dices size={12} /> Random
                            </button>
                        )}
                    </div>

                    <div className="solo-tracker__input-row">
                        <input
                            type="text"
                            className="solo-tracker__input"
                            placeholder="Add NPC, rival, ally..."
                            value={newCharInput}
                            onChange={(e) => setNewCharInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCharacter()}
                        />
                        <button
                            type="button"
                            className="action-button action-button--theme"
                            onClick={handleAddCharacter}
                            title="Add character"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <ul className="solo-tracker__list">
                        {characters.map((char, index) => (
                            <li key={`${char}-${index}`} className="solo-tracker__item">
                                <span className="solo-tracker__item-text">
                                    <strong style={{ color: 'var(--primary)', marginRight: '6px' }}>
                                        #{index + 1}
                                    </strong>
                                    {char}
                                </span>
                                <button
                                    type="button"
                                    className="solo-tracker__delete-btn"
                                    onClick={() => handleDeleteCharacter(index)}
                                    title="Delete character"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </li>
                        ))}
                        {characters.length === 0 && (
                            <li className="text-subtext" style={{ padding: '8px', textAlign: 'center' }}>
                                No active characters. Add one above!
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
