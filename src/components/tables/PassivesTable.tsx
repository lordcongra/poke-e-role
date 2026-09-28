import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TooltipIcon } from '../ui/TooltipIcon';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import { SmartTagsGuideModal } from '../modals/items/SmartTagsGuideModal';
import { TagPillList } from '../ui/TagPillList';
import { extractTagsFromText } from '../modals/items/tagBuilder/tagBuilderLogic';
import {
    Check,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Tag,
    Eye,
    EyeOff,
    AlertTriangle,
    XCircle,
    Dices
} from 'lucide-react';
import './PassivesTable.css';

export function PassivesTable() {
    const passives = useCharacterStore((state) => state.passives) || [];
    const addPassive = useCharacterStore((state) => state.addPassive);
    const updatePassive = useCharacterStore((state) => state.updatePassive);
    const removePassive = useCharacterStore((state) => state.removePassive);
    const moveUpPassive = useCharacterStore((state) => state.moveUpPassive);
    const moveDownPassive = useCharacterStore((state) => state.moveDownPassive);

    const [deletePassiveId, setDeletePassiveId] = useState<string | null>(null);
    const [tagBuilderData, setTagBuilderData] = useState<{ id: string; type: 'passive'; initialTag?: string } | null>(
        null
    );
    const [showTagsGuide, setShowTagsGuide] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const activeCount = passives.filter((p) => p.active !== false).length;

    const passivesHeaderElements = (
        <div className="passives-table__header-actions">
            <TooltipIcon onClick={() => setShowInfoModal(true)} />
            <button
                type="button"
                className="action-button action-button--dark passives-table__tags-guide-btn text-theme-header"
                onClick={() => setShowTagsGuide(true)}
                title="View Smart Tags Guide"
            >
                <Tag size={13} /> Tags Guide
            </button>
            <span className="text-subtext passives-table__header-count" title="Active Passives">
                {activeCount} / {passives.length} Active
            </span>
        </div>
    );

    const passiveToDelete = passives.find((p) => p.id === deletePassiveId);

    return (
        <div className="passives-table-wrapper">
            <CollapsingSection title="PASSIVES" headerElements={passivesHeaderElements} className="sheet-panel">
                {passives.length === 0 ? (
                    <div className="passives-table__empty text-subtext">
                        No passives added yet. Click &ldquo;+ Add Passive&rdquo; to add permanent stat increases, boons,
                        or traits.
                    </div>
                ) : (
                    <>
                        <div className="desktop-only-flex table-responsive-wrapper">
                            <table className="data-table passives-table__table">
                                <thead>
                                    <tr className="text-theme-header">
                                        <th className="passives-table__cell-check" title="Active? Toggle effect on/off">
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Check size={16} />
                                            </div>
                                        </th>
                                        <th className="passives-table__cell-name">Passive Name</th>
                                        <th className="passives-table__cell-desc">Effect / Tags</th>
                                        <th
                                            className="passives-table__cell-cond"
                                            title="Show in Round Tracker Conditions (default off)"
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Eye size={15} />
                                            </div>
                                        </th>
                                        <th className="passives-table__cell-log" title="Show in Roll Log (default on)">
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Dices size={15} />
                                            </div>
                                        </th>
                                        <th className="passives-table__cell-sort">Sort</th>
                                        <th className="passives-table__cell-del">Del</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {passives.map((passive, index) => (
                                        <tr key={passive.id} className="data-table__row--dynamic passives-table__row">
                                            <td className="passives-table__cell-check">
                                                <input
                                                    type="checkbox"
                                                    className="passives-table__checkbox"
                                                    checked={passive.active !== false}
                                                    onChange={(e) =>
                                                        updatePassive(passive.id, 'active', e.target.checked)
                                                    }
                                                    title={
                                                        passive.active !== false
                                                            ? 'Passive active (Click to disable)'
                                                            : 'Passive disabled (Click to activate)'
                                                    }
                                                />
                                            </td>
                                            <td className="passives-table__cell-name">
                                                <input
                                                    type="text"
                                                    className="passives-table__input text-label"
                                                    value={passive.name}
                                                    onChange={(e) => updatePassive(passive.id, 'name', e.target.value)}
                                                    placeholder="e.g. Rare Candy"
                                                />
                                            </td>
                                            <td className="passives-table__cell-desc">
                                                <div className="passives-table__desc-wrapper">
                                                    <TagPillList
                                                        tags={extractTagsFromText(passive.desc)}
                                                        onEditTag={(tagStr) =>
                                                            setTagBuilderData({
                                                                id: passive.id,
                                                                type: 'passive',
                                                                initialTag: tagStr
                                                            })
                                                        }
                                                        onDeleteTag={(rawTag) => {
                                                            const updated = passive.desc
                                                                .replace(rawTag, '')
                                                                .replace(/\s+/g, ' ')
                                                                .trim();
                                                            updatePassive(passive.id, 'desc', updated);
                                                        }}
                                                        onAddTag={() =>
                                                            setTagBuilderData({ id: passive.id, type: 'passive' })
                                                        }
                                                        emptyText="No tags"
                                                    />
                                                    <input
                                                        type="text"
                                                        className="passives-table__note-input text-subtext"
                                                        value={passive.desc.replace(/\[[^\]]+\]/g, '').trim()}
                                                        onChange={(e) => {
                                                            const tagsOnly = (
                                                                passive.desc.match(/\[[^\]]+\]/g) || []
                                                            ).join(' ');
                                                            const newDesc = `${tagsOnly} ${e.target.value}`.trim();
                                                            updatePassive(passive.id, 'desc', newDesc);
                                                        }}
                                                        placeholder="Notes (optional)..."
                                                    />
                                                </div>
                                            </td>
                                            <td className="passives-table__cell-cond">
                                                <button
                                                    type="button"
                                                    className={`passives-table__cond-btn ${
                                                        passive.showInConditions
                                                            ? 'passives-table__cond-btn--active'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        updatePassive(
                                                            passive.id,
                                                            'showInConditions',
                                                            !passive.showInConditions
                                                        )
                                                    }
                                                    title={
                                                        passive.showInConditions
                                                            ? 'Showing in Round Tracker Conditions (Click to hide)'
                                                            : 'Hidden from Round Tracker Conditions (Click to show)'
                                                    }
                                                >
                                                    {passive.showInConditions ? (
                                                        <Eye size={16} style={{ color: 'var(--primary, #3b82f6)' }} />
                                                    ) : (
                                                        <EyeOff
                                                            size={16}
                                                            style={{ opacity: 0.35, color: 'var(--text-main)' }}
                                                        />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="passives-table__cell-log">
                                                <button
                                                    type="button"
                                                    className={`passives-table__cond-btn ${
                                                        passive.showInRollLog !== false
                                                            ? 'passives-table__cond-btn--active'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        updatePassive(
                                                            passive.id,
                                                            'showInRollLog',
                                                            passive.showInRollLog === false ? true : false
                                                        )
                                                    }
                                                    title={
                                                        passive.showInRollLog !== false
                                                            ? 'Showing in Roll Log (Click to hide)'
                                                            : 'Hidden from Roll Log (Click to show)'
                                                    }
                                                >
                                                    <Dices
                                                        size={16}
                                                        style={{
                                                            color:
                                                                passive.showInRollLog !== false
                                                                    ? 'var(--primary, #3b82f6)'
                                                                    : 'var(--text-main)',
                                                            opacity: passive.showInRollLog !== false ? 1 : 0.35
                                                        }}
                                                    />
                                                </button>
                                            </td>
                                            <td className="passives-table__cell-sort">
                                                <div className="passives-table__sort-group">
                                                    <button
                                                        type="button"
                                                        className="action-button action-button--ghost passives-table__sort-btn"
                                                        onClick={() => moveUpPassive(passive.id)}
                                                        disabled={index === 0}
                                                        title="Move Up"
                                                    >
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="action-button action-button--ghost passives-table__sort-btn"
                                                        onClick={() => moveDownPassive(passive.id)}
                                                        disabled={index === passives.length - 1}
                                                        title="Move Down"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="passives-table__cell-del">
                                                <button
                                                    type="button"
                                                    className="action-button action-button--ghost passives-table__del-btn"
                                                    onClick={() => setDeletePassiveId(passive.id)}
                                                    title="Delete Passive"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile view */}
                        <div className="mobile-only-flex passives-table__mobile-list">
                            {passives.map((passive, index) => (
                                <div key={passive.id} className="passives-table__mobile-card">
                                    <div className="passives-table__mobile-header">
                                        <input
                                            type="checkbox"
                                            className="passives-table__checkbox"
                                            checked={passive.active !== false}
                                            onChange={(e) => updatePassive(passive.id, 'active', e.target.checked)}
                                        />
                                        <input
                                            type="text"
                                            className="passives-table__input text-label"
                                            value={passive.name}
                                            onChange={(e) => updatePassive(passive.id, 'name', e.target.value)}
                                            placeholder="Passive Name"
                                        />
                                    </div>
                                    <div className="passives-table__desc-wrapper">
                                        <TagPillList
                                            tags={extractTagsFromText(passive.desc)}
                                            onEditTag={(tagStr) =>
                                                setTagBuilderData({
                                                    id: passive.id,
                                                    type: 'passive',
                                                    initialTag: tagStr
                                                })
                                            }
                                            onDeleteTag={(rawTag) => {
                                                const updated = passive.desc
                                                    .replace(rawTag, '')
                                                    .replace(/\s+/g, ' ')
                                                    .trim();
                                                updatePassive(passive.id, 'desc', updated);
                                            }}
                                            onAddTag={() => setTagBuilderData({ id: passive.id, type: 'passive' })}
                                            emptyText="No tags"
                                        />
                                        <input
                                            type="text"
                                            className="passives-table__note-input text-subtext"
                                            value={passive.desc.replace(/\[[^\]]+\]/g, '').trim()}
                                            onChange={(e) => {
                                                const tagsOnly = (passive.desc.match(/\[[^\]]+\]/g) || []).join(' ');
                                                const newDesc = `${tagsOnly} ${e.target.value}`.trim();
                                                updatePassive(passive.id, 'desc', newDesc);
                                            }}
                                            placeholder="Notes (optional)..."
                                        />
                                    </div>
                                    <div className="passives-table__mobile-actions">
                                        <button
                                            type="button"
                                            className="action-button action-button--dark passives-table__tags-guide-btn"
                                            onClick={() =>
                                                updatePassive(passive.id, 'showInConditions', !passive.showInConditions)
                                            }
                                        >
                                            {passive.showInConditions ? (
                                                <>
                                                    <Eye size={14} style={{ color: 'var(--primary)' }} /> In Conditions
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff size={14} style={{ opacity: 0.5 }} /> Hide from Conditions
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark passives-table__tags-guide-btn"
                                            onClick={() =>
                                                updatePassive(
                                                    passive.id,
                                                    'showInRollLog',
                                                    passive.showInRollLog === false ? true : false
                                                )
                                            }
                                            title={
                                                passive.showInRollLog !== false
                                                    ? 'Showing in Roll Log (Click to hide)'
                                                    : 'Hidden from Roll Log (Click to show)'
                                            }
                                        >
                                            <Dices
                                                size={14}
                                                style={{
                                                    color:
                                                        passive.showInRollLog !== false ? 'var(--primary)' : 'inherit',
                                                    opacity: passive.showInRollLog !== false ? 1 : 0.5
                                                }}
                                            />
                                            {passive.showInRollLog !== false ? 'In Roll Log' : 'Hide from Log'}
                                        </button>
                                        <div className="passives-table__sort-group">
                                            <button
                                                type="button"
                                                className="action-button action-button--ghost passives-table__sort-btn"
                                                onClick={() => moveUpPassive(passive.id)}
                                                disabled={index === 0}
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="action-button action-button--ghost passives-table__sort-btn"
                                                onClick={() => moveDownPassive(passive.id)}
                                                disabled={index === passives.length - 1}
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="action-button action-button--ghost passives-table__del-btn"
                                                onClick={() => setDeletePassiveId(passive.id)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <button
                    type="button"
                    onClick={addPassive}
                    className="action-button action-button--theme passives-table__add-btn text-theme-header"
                >
                    <Plus size={16} /> Add Passive
                </button>
            </CollapsingSection>

            {/* Tag Builder Modal for Passives */}
            {tagBuilderData && (
                <TagBuilderModal
                    targetId={tagBuilderData.id}
                    targetType="passive"
                    initialTag={tagBuilderData.initialTag}
                    onClose={() => setTagBuilderData(null)}
                />
            )}

            {/* Smart Tags Guide Modal */}
            {showTagsGuide && <SmartTagsGuideModal onClose={() => setShowTagsGuide(false)} />}

            {/* Info / Tooltip Modal */}
            {showInfoModal && (
                <div
                    className="tracker-modal__overlay"
                    onClick={(e) => e.target === e.currentTarget && setShowInfoModal(false)}
                >
                    <div className="tracker-modal__content">
                        <h3 className="tracker-modal__title text-title-primary">Passives & Permanent Boons</h3>
                        <p
                            className="tracker-modal__description text-subtext"
                            style={{ color: 'var(--text-main)', lineHeight: 1.5 }}
                        >
                            Passives allow you to track permanent stat increases, boons, blessings, or training perks
                            that aren't equipped inventory items (such as a <strong>Rare Candy</strong> bonus attribute,{' '}
                            <strong>Legendary Pokemon Blessing</strong>, or custom background perk).
                        </p>
                        <p
                            className="tracker-modal__description text-subtext"
                            style={{ marginTop: '8px', color: 'var(--text-main)', lineHeight: 1.5 }}
                        >
                            Passives display bonuses as <strong>Interactive Smart Tag Pills</strong>. Use the{' '}
                            <strong>+ Tag</strong> button to add bonuses visually via the Tag Builder. Click any pill to
                            adjust numbers or click ✕ to delete—no typing brackets required!
                        </p>
                        <p
                            className="tracker-modal__description text-subtext"
                            style={{ marginTop: '8px', color: 'var(--text-main)', lineHeight: 1.5 }}
                        >
                            Use the <strong>Eye icon</strong> toggle on any passive to choose whether it appears in the{' '}
                            <strong>Conditions</strong> section of the Round Tracker. Use the <strong>Dice icon</strong>{' '}
                            toggle to include or exclude it from appearing in the <strong>Roll Log</strong>.
                        </p>
                        <div
                            className="tracker-modal__actions tracker-modal__actions--center"
                            style={{ gap: '8px', marginTop: '16px' }}
                        >
                            <button
                                type="button"
                                className="action-button action-button--theme"
                                onClick={() => {
                                    setShowInfoModal(false);
                                    setShowTagsGuide(true);
                                }}
                            >
                                <Tag size={14} /> Open Tags Guide
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--dark tracker-modal__btn-cancel"
                                onClick={() => setShowInfoModal(false)}
                            >
                                <XCircle size={16} /> Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletePassiveId && (
                <div className="inventory-table__modal-overlay">
                    <div className="inventory-table__modal-content">
                        <h3
                            className="inventory-table__modal-title modal-title-with-icon text-title-primary"
                            style={{ color: 'var(--semantic-danger)' }}
                        >
                            <AlertTriangle size={20} /> Confirm Deletion
                        </h3>
                        <p
                            className="inventory-table__modal-text text-subtext"
                            style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}
                        >
                            Are you sure you want to delete &ldquo;{passiveToDelete?.name || 'this Passive'}&rdquo;?
                        </p>
                        <div className="inventory-table__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark inventory-table__modal-btn text-theme-header"
                                onClick={() => setDeletePassiveId(null)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red inventory-table__modal-btn text-theme-header"
                                onClick={() => {
                                    removePassive(deletePassiveId);
                                    setDeletePassiveId(null);
                                }}
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
