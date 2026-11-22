import { useState } from 'react';
import { Compass, Sparkles, BookOpen, HelpCircle, X } from 'lucide-react';
import { SoloFateTab } from './SoloFateTab';
import { SoloPromptsTab } from './SoloPromptsTab';
import { SoloTrackerTab } from './SoloTrackerTab';
import { SoloGuideTab } from './SoloGuideTab';
import {
    getStoredSoloOracleState,
    saveStoredSoloOracleState,
    rollFateCheck,
    broadcastFateCheckRoll,
    type SoloOracleState,
    type FateCheckResult
} from '@/utils/solo/oracleUtils';
import './SoloOracleModal.css';

interface SoloOracleModalProps {
    onClose: () => void;
}

type TabType = 'oracle' | 'prompts' | 'tracker' | 'guide';

export function SoloOracleModal({ onClose }: SoloOracleModalProps) {
    const [state, setState] = useState<SoloOracleState>(() => getStoredSoloOracleState());
    const [activeTab, setActiveTab] = useState<TabType>('oracle');

    const updateState = (updater: (prev: SoloOracleState) => SoloOracleState) => {
        setState((prev) => {
            const next = updater(prev);
            saveStoredSoloOracleState(next);
            return next;
        });
    };

    const handleChaosChange = (newChaos: number) => {
        updateState((prev) => ({ ...prev, chaosFactor: newChaos }));
    };

    const handleRollFate = async (odds: number) => {
        const result: FateCheckResult = rollFateCheck(odds, state.chaosFactor);
        updateState((prev) => ({ ...prev, lastFateCheck: result }));
        await broadcastFateCheckRoll(result);
    };

    const handleUpdateThreads = (threads: string[]) => {
        updateState((prev) => ({ ...prev, threads }));
    };

    const handleUpdateCharacters = (characters: string[]) => {
        updateState((prev) => ({ ...prev, characters }));
    };

    return (
        <div className="solo-oracle-modal__overlay" onClick={onClose}>
            <div className="solo-oracle-modal__content" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="solo-oracle-modal__header">
                    <h3 className="solo-oracle-modal__title text-title-primary">
                        <Compass size={20} /> Solo Play Oracle & Prompts
                    </h3>
                    <button
                        type="button"
                        className="solo-oracle-modal__close-btn"
                        onClick={onClose}
                        title="Close Oracle"
                        aria-label="Close"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="solo-oracle-modal__nav">
                    <button
                        type="button"
                        className={`solo-oracle-modal__tab-btn ${activeTab === 'oracle' ? 'solo-oracle-modal__tab-btn--active' : ''}`}
                        onClick={() => setActiveTab('oracle')}
                    >
                        <Sparkles size={14} /> Fate Oracle
                    </button>
                    <button
                        type="button"
                        className={`solo-oracle-modal__tab-btn ${activeTab === 'prompts' ? 'solo-oracle-modal__tab-btn--active' : ''}`}
                        onClick={() => setActiveTab('prompts')}
                    >
                        <Compass size={14} /> Prompts & Twists
                    </button>
                    <button
                        type="button"
                        className={`solo-oracle-modal__tab-btn ${activeTab === 'tracker' ? 'solo-oracle-modal__tab-btn--active' : ''}`}
                        onClick={() => setActiveTab('tracker')}
                    >
                        <BookOpen size={14} /> Campaign Lists
                    </button>
                    <button
                        type="button"
                        className={`solo-oracle-modal__tab-btn ${activeTab === 'guide' ? 'solo-oracle-modal__tab-btn--active' : ''}`}
                        onClick={() => setActiveTab('guide')}
                    >
                        <HelpCircle size={14} /> Solo Guide
                    </button>
                </div>

                {/* Tab Body */}
                <div className="solo-oracle-modal__body">
                    {activeTab === 'oracle' && (
                        <SoloFateTab
                            chaosFactor={state.chaosFactor}
                            onChaosChange={handleChaosChange}
                            lastResult={state.lastFateCheck || null}
                            onRollFate={handleRollFate}
                            onGoToPrompts={() => setActiveTab('prompts')}
                        />
                    )}

                    {activeTab === 'prompts' && <SoloPromptsTab />}

                    {activeTab === 'tracker' && (
                        <SoloTrackerTab
                            threads={state.threads}
                            characters={state.characters}
                            onUpdateThreads={handleUpdateThreads}
                            onUpdateCharacters={handleUpdateCharacters}
                        />
                    )}

                    {activeTab === 'guide' && <SoloGuideTab />}
                </div>
            </div>
        </div>
    );
}
