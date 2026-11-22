import { useState, useEffect } from 'react';
import { Compass, Sparkles, BookOpen, HelpCircle, History, Folder, ExternalLink, X, Swords } from 'lucide-react';
import { SoloFateTab } from './SoloFateTab';
import { SoloBattleTab } from './SoloBattleTab';
import { SoloPromptsTab } from './SoloPromptsTab';
import { SoloLogTab } from './SoloLogTab';
import { SoloTrackerTab } from './SoloTrackerTab';
import { SoloGuideTab } from './SoloGuideTab';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import {
    getStoredSoloOracleState,
    saveStoredSoloOracleState,
    getCampaignData,
    updateCampaignData,
    removeCampaignData,
    rollFateCheck,
    broadcastFateCheckRoll,
    type SoloOracleState,
    type FateCheckResult
} from '@/utils/solo/oracleUtils';
import {
    getActiveCampaign,
    setActiveCampaign as setStoredActiveCampaign,
    getSoloCampaigns,
    addSoloLog,
    DEFAULT_CAMPAIGN
} from '@/utils/solo/soloLogStorage';
import './SoloOracleModal.css';

interface SoloOracleModalProps {
    onClose: () => void;
}

type TabType = 'oracle' | 'battle' | 'prompts' | 'log' | 'tracker' | 'guide';

export function SoloOracleModal({ onClose }: SoloOracleModalProps) {
    const [state, setState] = useState<SoloOracleState>(() => getStoredSoloOracleState());
    const [activeTab, setActiveTab] = useState<TabType>('oracle');
    const [activeCampaign, setActiveCampaign] = useState<string>(() => getActiveCampaign());
    const [campaigns, setCampaigns] = useState<string[]>([DEFAULT_CAMPAIGN]);
    const [lastQuestion, setLastQuestion] = useState<string>('');

    useEffect(() => {
        getSoloCampaigns()
            .then((list) => {
                if (list && list.length > 0) {
                    setCampaigns(list);
                    if (!list.includes(activeCampaign)) {
                        const fallback = list[0];
                        setActiveCampaign(fallback);
                        setStoredActiveCampaign(fallback);
                    }
                }
            })
            .catch((e) => console.warn('[SoloOracleModal] Failed to load campaigns:', e));
    }, []);

    const activeData = getCampaignData(state, activeCampaign);

    const handleSelectCampaign = (camp: string) => {
        setActiveCampaign(camp);
        setStoredActiveCampaign(camp);
    };

    const handleCampaignsChange = (newCampaigns: string[]) => {
        setCampaigns(newCampaigns);
        // Clean up data for any deleted campaign
        setState((prev) => {
            let next = prev;
            if (prev.campaignData) {
                Object.keys(prev.campaignData).forEach((c) => {
                    if (!newCampaigns.includes(c)) {
                        next = removeCampaignData(next, c);
                    }
                });
            }
            saveStoredSoloOracleState(next);
            return next;
        });
    };

    const updateState = (updater: (prev: SoloOracleState) => SoloOracleState) => {
        setState((prev) => {
            const next = updater(prev);
            saveStoredSoloOracleState(next);
            return next;
        });
    };

    const handleChaosChange = (newChaos: number) => {
        updateState((prev) => updateCampaignData(prev, activeCampaign, { chaosFactor: newChaos }));
    };

    const handleRollFate = async (odds: number, question?: string) => {
        const result: FateCheckResult = rollFateCheck(odds, activeData.chaosFactor);
        const trimmedQuestion = question?.trim() || '';
        setLastQuestion(trimmedQuestion);
        updateState((prev) => updateCampaignData(prev, activeCampaign, { lastFateCheck: result }));

        await broadcastFateCheckRoll(result, trimmedQuestion);

        await addSoloLog({
            campaign: activeCampaign,
            type: 'fate',
            question: trimmedQuestion || undefined,
            odds: result.odds,
            oddsLabel: result.oddsLabel,
            chaosFactor: result.chaosFactor,
            target: result.target,
            roll: result.roll,
            result: result.result,
            isRandomEvent: result.isRandomEvent,
            label: 'Fate Check'
        });
    };

    const handleLogPrompt = async (prompt: { label: string; result: string; details?: string; roll: number }) => {
        await addSoloLog({
            campaign: activeCampaign,
            type: 'prompt',
            roll: prompt.roll,
            result: prompt.result,
            label: prompt.label,
            details: prompt.details
        });
    };

    const handleUpdateThreads = (threads: string[]) => {
        updateState((prev) => updateCampaignData(prev, activeCampaign, { threads }));
    };

    const handleUpdateCharacters = (characters: string[]) => {
        updateState((prev) => updateCampaignData(prev, activeCampaign, { characters }));
    };

    const isPoppedOutWindow =
        typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('modal') === 'solo-oracle';

    const handlePopout = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('modal', 'solo-oracle');
        window.open(
            url.toString(),
            'pkr-solo-oracle-window',
            'width=860,height=740,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
        );
        onClose();
    };

    const handleClose = () => {
        if (isPoppedOutWindow && window.opener) {
            window.close();
        } else {
            onClose();
        }
    };

    return (
        <div
            className={`solo-oracle-modal__overlay ${isPoppedOutWindow ? 'solo-oracle-modal__overlay--popped-out' : ''}`}
            onClick={isPoppedOutWindow ? undefined : onClose}
        >
            <div
                className={`solo-oracle-modal__content ${isPoppedOutWindow ? 'solo-oracle-modal__content--popped-out' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="solo-oracle-modal__header">
                    <h3 className="solo-oracle-modal__title text-title-primary">
                        <Compass size={20} /> Solo Play Oracle & Prompts
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="solo-log__campaign-select-wrap">
                            <Folder size={15} color="var(--primary)" />
                            <select
                                className="solo-log__campaign-select"
                                value={activeCampaign}
                                onChange={(e) => handleSelectCampaign(e.target.value)}
                                title="Active Campaign folder"
                            >
                                {campaigns.map((camp) => (
                                    <option key={camp} value={camp}>
                                        {camp}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isStandaloneMode && !isPoppedOutWindow && (
                            <button
                                type="button"
                                className="solo-oracle-modal__popout-btn"
                                onClick={handlePopout}
                                title="Pop out Oracle to a separate window (for dual monitor play)"
                                aria-label="Pop out Oracle"
                            >
                                <ExternalLink size={17} />
                            </button>
                        )}

                        <button
                            type="button"
                            className="solo-oracle-modal__close-btn"
                            onClick={handleClose}
                            title="Close Oracle"
                            aria-label="Close"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>
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
                        className={`solo-oracle-modal__tab-btn ${activeTab === 'battle' ? 'solo-oracle-modal__tab-btn--active' : ''}`}
                        onClick={() => setActiveTab('battle')}
                    >
                        <Swords size={14} /> Battle Oracle
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
                        className={`solo-oracle-modal__tab-btn ${activeTab === 'log' ? 'solo-oracle-modal__tab-btn--active' : ''}`}
                        onClick={() => setActiveTab('log')}
                    >
                        <History size={14} /> Oracle Log
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
                            chaosFactor={activeData.chaosFactor}
                            onChaosChange={handleChaosChange}
                            lastResult={activeData.lastFateCheck || null}
                            lastQuestion={lastQuestion}
                            onRollFate={handleRollFate}
                            onGoToPrompts={() => setActiveTab('prompts')}
                        />
                    )}

                    {activeTab === 'battle' && (
                        <SoloBattleTab activeCampaign={activeCampaign} chaosFactor={activeData.chaosFactor} />
                    )}

                    {activeTab === 'prompts' && <SoloPromptsTab onLogPrompt={handleLogPrompt} />}

                    {activeTab === 'log' && (
                        <SoloLogTab
                            activeCampaign={activeCampaign}
                            campaigns={campaigns}
                            onSelectCampaign={handleSelectCampaign}
                            onCampaignsChange={handleCampaignsChange}
                        />
                    )}

                    {activeTab === 'tracker' && (
                        <SoloTrackerTab
                            activeCampaign={activeCampaign}
                            threads={activeData.threads}
                            characters={activeData.characters}
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
