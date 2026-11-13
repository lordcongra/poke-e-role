import { StrictMode, useState, useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Dices, Trash2, Minus, ChevronUp, X } from 'lucide-react';
import OBR from '@owlbear-rodeo/sdk';
import { useRollLogSync } from './hooks/useRollLogSync';
import { RollLogEntryItem } from './components/rollLog/RollLogEntryItem';
import { RollFactorsModal } from './components/modals/rollFactors';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './style.css';
import './roll-log.css';

// Strictly type the custom Window property for HMR to avoid 'any'
interface WindowWithReactRoot extends Window {
    __REACT_ROOT__?: Root;
}

export function RollLog() {
    const { rolls, resolvedIcons, dismiss, clearAll } = useRollLogSync();
    const [isMinimized, setIsMinimized] = useState(false);
    const [factorsModalData, setFactorsModalData] = useState<{
        title: string;
        characterName?: string;
        coreTags: string[];
        factors: string[];
        result?: string;
    } | null>(null);

    const prevRollsCountRef = useRef(rolls.length);
    useEffect(() => {
        if (rolls.length > prevRollsCountRef.current && isMinimized) {
            setIsMinimized(false);
            if (OBR.isAvailable) {
                OBR.popover.setHeight('pkr-roll-log', 380).catch(() => {});
            }
        }
        prevRollsCountRef.current = rolls.length;
    }, [rolls.length, isMinimized]);

    const handleToggleMinimize = async () => {
        const next = !isMinimized;
        setIsMinimized(next);
        if (OBR.isAvailable) {
            try {
                await OBR.popover.setHeight('pkr-roll-log', next ? 44 : 380);
            } catch (e) {
                console.warn('[RollLog] Failed to set popover height:', e);
            }
        }
    };

    const handleClose = async () => {
        if (OBR.isAvailable) {
            try {
                if (isMinimized) {
                    await OBR.popover.setHeight('pkr-roll-log', 380).catch(() => {});
                }
                await OBR.popover.close('pkr-roll-log');
            } catch (e) {
                console.warn('[RollLog] Failed to close popover:', e);
            }
        }
    };

    return (
        <div className="roll-log-wrapper">
            <div className={`roll-log__container ${isMinimized ? 'roll-log__container--minimized' : ''}`}>
                <div className={`roll-log__header ${isMinimized ? 'roll-log__header--minimized' : ''}`}>
                    <h3 className="roll-log__title text-title-primary">
                        <Dices size={18} /> Roll Log {isMinimized && rolls.length > 0 && <span className="roll-log__count-badge">({rolls.length})</span>}
                    </h3>
                    <div className="roll-log__header-actions">
                        {rolls.length > 0 && !isMinimized && (
                            <button
                                type="button"
                                onClick={clearAll}
                                className="action-button action-button--red roll-log__clear-btn text-theme-header"
                                title="Clear All Rolls"
                                aria-label="Clear All Rolls"
                            >
                                <Trash2 size={13} /> Clear
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleToggleMinimize}
                            className="roll-log__ctrl-btn"
                            title={isMinimized ? 'Expand Roll Log' : 'Minimize Roll Log'}
                            aria-label={isMinimized ? 'Expand Roll Log' : 'Minimize Roll Log'}
                        >
                            {isMinimized ? <ChevronUp size={14} /> : <Minus size={14} />}
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="roll-log__ctrl-btn roll-log__ctrl-btn--close"
                            title="Close Roll Log"
                            aria-label="Close Roll Log"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {!isMinimized && (
                    rolls.length === 0 ? (
                        <div
                            className="text-subtext"
                            style={{
                                margin: 'auto',
                                textAlign: 'center',
                                padding: '30px 16px',
                                color: 'var(--text-muted, #888)'
                            }}
                        >
                            Waiting for rolls...
                        </div>
                    ) : (
                        <div className="roll-log__list">
                            {rolls.map((r) => (
                                <RollLogEntryItem
                                    key={r.id}
                                    roll={r}
                                    resolvedIcon={resolvedIcons[r.id]}
                                    onDismiss={dismiss}
                                    onOpenFactors={setFactorsModalData}
                                />
                            ))}
                        </div>
                    )
                )}
            </div>

            {factorsModalData && (
                <RollFactorsModal
                    title={factorsModalData.title}
                    characterName={factorsModalData.characterName}
                    coreTags={factorsModalData.coreTags}
                    factors={factorsModalData.factors}
                    result={factorsModalData.result}
                    onClose={() => setFactorsModalData(null)}
                />
            )}
        </div>
    );
}

// ⚠️ HMR-Safe React Root Injection!
const container = document.getElementById('root')!;
const win = window as WindowWithReactRoot;
if (!win.__REACT_ROOT__) {
    win.__REACT_ROOT__ = createRoot(container);
}
win.__REACT_ROOT__.render(
    <StrictMode>
        <ErrorBoundary>
            <RollLog />
        </ErrorBoundary>
    </StrictMode>
);
