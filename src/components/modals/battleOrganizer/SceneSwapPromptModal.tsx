import { AlertCircle, Trash2, ArrowRight } from 'lucide-react';

export interface SceneSwapPromptModalProps {
    isOpen: boolean;
    onClearForNewScene: () => void;
    onKeepCurrentBattle: () => void;
}

export function SceneSwapPromptModal({ isOpen, onClearForNewScene, onKeepCurrentBattle }: SceneSwapPromptModalProps) {
    if (!isOpen) return null;

    return (
        <div className="bo-settings__overlay" role="dialog" aria-modal="true">
            <div className="bo-settings__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div className="bo-settings__header-row">
                    <h3 className="bo-settings__title text-title-primary">
                        <AlertCircle size={20} color="var(--primary)" />
                        New Scene Detected
                    </h3>
                </div>

                <div
                    style={{
                        padding: '10px 0',
                        fontSize: '0.9rem',
                        lineHeight: '1.45',
                        color: 'var(--text-main)'
                    }}
                >
                    The Battle Organizer currently holds encounter data from another scene. Would you like to clear the
                    organizer for this scene?
                </div>

                <div className="bo-settings__btn-row" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                        type="button"
                        className="action-button action-button--secondary"
                        onClick={onKeepCurrentBattle}
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                        <ArrowRight size={14} />
                        Keep Current Battle
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--red"
                        onClick={onClearForNewScene}
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                        <Trash2 size={14} />
                        Clear for New Scene
                    </button>
                </div>
            </div>
        </div>
    );
}
