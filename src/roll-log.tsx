import { StrictMode, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Dices, Trash2 } from 'lucide-react';
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
    const [factorsModalData, setFactorsModalData] = useState<{
        title: string;
        characterName?: string;
        coreTags: string[];
        factors: string[];
        result?: string;
    } | null>(null);

    if (rolls.length === 0) {
        return (
            <div className="roll-log-wrapper">
                <div className="roll-log__container" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="roll-log__header">
                        <h3 className="roll-log__title text-title-primary">
                            <Dices size={20} /> Roll Log
                        </h3>
                    </div>
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
                </div>
            </div>
        );
    }

    return (
        <div className="roll-log-wrapper">
            <div className="roll-log__container">
                <div className="roll-log__header">
                    <h3 className="roll-log__title text-title-primary">
                        <Dices size={20} /> Roll Log
                    </h3>
                    <button
                        type="button"
                        onClick={clearAll}
                        className="action-button action-button--red roll-log__clear-btn text-theme-header"
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                </div>
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
