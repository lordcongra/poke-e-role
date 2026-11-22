import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Plus, Folder, Clock, Check, X } from 'lucide-react';
import {
    getSoloLogs,
    deleteSoloLog,
    clearSoloLogs,
    createSoloCampaign,
    deleteSoloCampaign,
    DEFAULT_CAMPAIGN,
    type SoloLogEntry
} from '@/utils/solo/soloLogStorage';

interface SoloLogTabProps {
    activeCampaign: string;
    campaigns: string[];
    onSelectCampaign: (camp: string) => void;
    onCampaignsChange: (camps: string[]) => void;
}

export function SoloLogTab({ activeCampaign, campaigns, onSelectCampaign, onCampaignsChange }: SoloLogTabProps) {
    const [logs, setLogs] = useState<SoloLogEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Double-confirm states
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [isConfirmingClearAll, setIsConfirmingClearAll] = useState<boolean>(false);
    const [isConfirmingDeleteCampaign, setIsConfirmingDeleteCampaign] = useState<boolean>(false);

    // New campaign creation state
    const [isCreatingCampaign, setIsCreatingCampaign] = useState<boolean>(false);
    const [newCampaignName, setNewCampaignName] = useState<string>('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const list = await getSoloLogs(activeCampaign);
            setLogs(list);
        } catch (e) {
            console.warn('[SoloLogTab] Failed to fetch logs:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [activeCampaign]);

    const handleDeleteSingle = async (id: string) => {
        await deleteSoloLog(id);
        setConfirmDeleteId(null);
        await fetchLogs();
    };

    const handleClearAll = async () => {
        await clearSoloLogs(activeCampaign);
        setIsConfirmingClearAll(false);
        await fetchLogs();
    };

    const handleCreateCampaign = async () => {
        const trimmed = newCampaignName.trim();
        if (!trimmed) return;
        await createSoloCampaign(trimmed);
        const updated = [...campaigns, trimmed];
        onCampaignsChange(updated);
        onSelectCampaign(trimmed);
        setNewCampaignName('');
        setIsCreatingCampaign(false);
    };

    const handleDeleteCampaign = async () => {
        if (campaigns.length <= 1) return;
        await deleteSoloCampaign(activeCampaign);
        const remaining = campaigns.filter((c) => c !== activeCampaign);
        onCampaignsChange(remaining);
        onSelectCampaign(remaining[0] || DEFAULT_CAMPAIGN);
        setIsConfirmingDeleteCampaign(false);
    };

    const getBadgeClass = (res: string) => {
        switch (res) {
            case 'Exceptional Yes':
                return 'solo-fate__result-badge--exc-yes';
            case 'Yes':
                return 'solo-fate__result-badge--yes';
            case 'Exceptional No':
                return 'solo-fate__result-badge--exc-no';
            case 'No':
                return 'solo-fate__result-badge--no';
            default:
                return '';
        }
    };

    return (
        <div className="solo-log-tab">
            {/* Campaign Selector & Toolbar */}
            <div className="solo-log__header-toolbar">
                <div className="solo-log__campaign-select-wrap">
                    <Folder size={16} color="var(--primary)" />
                    <span className="text-label" style={{ fontWeight: 700 }}>
                        Campaign:
                    </span>
                    <select
                        className="solo-log__campaign-select"
                        value={activeCampaign}
                        onChange={(e) => {
                            onSelectCampaign(e.target.value);
                            setConfirmDeleteId(null);
                            setIsConfirmingClearAll(false);
                            setIsConfirmingDeleteCampaign(false);
                        }}
                    >
                        {campaigns.map((camp) => (
                            <option key={camp} value={camp}>
                                {camp}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="solo-log__campaign-actions">
                    {!isCreatingCampaign && (
                        <button
                            type="button"
                            className="action-button action-button--dark solo-log__btn-sm"
                            onClick={() => setIsCreatingCampaign(true)}
                            title="Create new campaign folder"
                        >
                            <Plus size={13} /> New
                        </button>
                    )}

                    {campaigns.length > 1 && !isConfirmingDeleteCampaign && (
                        <button
                            type="button"
                            className="action-button action-button--dark solo-log__btn-sm"
                            onClick={() => setIsConfirmingDeleteCampaign(true)}
                            title="Delete this campaign folder"
                        >
                            Delete Folder
                        </button>
                    )}

                    {logs.length > 0 && !isConfirmingClearAll && (
                        <button
                            type="button"
                            className="action-button action-button--red solo-log__btn-sm"
                            onClick={() => setIsConfirmingClearAll(true)}
                            title="Clear all logs for this campaign"
                        >
                            <Trash2 size={13} /> Clear Log
                        </button>
                    )}
                </div>
            </div>

            {/* Create Campaign Inline Form */}
            {isCreatingCampaign && (
                <div className="solo-log__inline-confirm">
                    <input
                        type="text"
                        className="solo-tracker__input"
                        placeholder="Enter campaign name (e.g. Johto Expedition)..."
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCampaign()}
                        autoFocus
                    />
                    <button
                        type="button"
                        className="action-button action-button--theme solo-log__btn-sm"
                        onClick={handleCreateCampaign}
                    >
                        <Check size={14} /> Create
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--dark solo-log__btn-sm"
                        onClick={() => {
                            setIsCreatingCampaign(false);
                            setNewCampaignName('');
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Double-Confirm Clear All Logs */}
            {isConfirmingClearAll && (
                <div className="solo-log__inline-confirm solo-log__inline-confirm--danger">
                    <AlertTriangle size={16} />
                    <span>
                        Clear all <strong>{logs.length}</strong> log entries in &ldquo;{activeCampaign}&rdquo;?
                    </span>
                    <button
                        type="button"
                        className="action-button action-button--red solo-log__btn-sm"
                        onClick={handleClearAll}
                    >
                        Yes, Clear All
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--dark solo-log__btn-sm"
                        onClick={() => setIsConfirmingClearAll(false)}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Double-Confirm Delete Campaign */}
            {isConfirmingDeleteCampaign && (
                <div className="solo-log__inline-confirm solo-log__inline-confirm--danger">
                    <AlertTriangle size={16} />
                    <span>Permanently delete campaign &ldquo;{activeCampaign}&rdquo; and all its logs?</span>
                    <button
                        type="button"
                        className="action-button action-button--red solo-log__btn-sm"
                        onClick={handleDeleteCampaign}
                    >
                        Yes, Delete Campaign
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--dark solo-log__btn-sm"
                        onClick={() => setIsConfirmingDeleteCampaign(false)}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Log Entries List */}
            <div className="solo-log__list">
                {loading && (
                    <div className="text-subtext" style={{ padding: '16px', textAlign: 'center' }}>
                        Loading oracle log...
                    </div>
                )}

                {!loading && logs.length === 0 && (
                    <div className="solo-log__empty-state">
                        <Clock size={24} color="var(--text-muted)" />
                        <span style={{ fontWeight: 600 }}>No entries in &ldquo;{activeCampaign}&rdquo; yet</span>
                        <span className="text-subtext">
                            Questions and prompt rolls will automatically be archived here in IndexedDB.
                        </span>
                    </div>
                )}

                {!loading &&
                    logs.map((entry) => (
                        <div key={entry.id} className="solo-log__item-card">
                            <div className="solo-log__item-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="solo-log__type-tag">{entry.label}</span>
                                    {entry.isRandomEvent && (
                                        <span className="solo-log__event-tag">⚡ RANDOM EVENT</span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                                        {new Date(entry.timestamp).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>

                                    {confirmDeleteId === entry.id ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button
                                                type="button"
                                                className="action-button action-button--red"
                                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                                                onClick={() => handleDeleteSingle(entry.id)}
                                                title="Confirm delete"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark"
                                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                                                onClick={() => setConfirmDeleteId(null)}
                                                title="Cancel"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="solo-tracker__delete-btn"
                                            onClick={() => setConfirmDeleteId(entry.id)}
                                            title="Delete entry"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {entry.question && (
                                <div className="solo-log__question-text">
                                    <span style={{ color: 'var(--text-muted)' }}>Q:</span> &ldquo;{entry.question}
                                    &rdquo;
                                </div>
                            )}

                            <div className="solo-log__result-row">
                                {entry.type === 'fate' ? (
                                    <>
                                        <span
                                            className={`solo-fate__result-badge ${getBadgeClass(entry.result)}`}
                                            style={{ fontSize: '0.9rem', padding: '4px 10px' }}
                                        >
                                            {entry.result}
                                        </span>
                                        <span className="text-subtext">
                                            Rolled {entry.roll} vs {entry.target} ({entry.oddsLabel}, Chaos{' '}
                                            {entry.chaosFactor})
                                        </span>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                            {entry.result}
                                        </span>
                                        {entry.details && <span className="text-subtext">{entry.details}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
