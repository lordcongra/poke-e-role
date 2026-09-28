import { AlertTriangle, Trash2, XCircle, HelpCircle } from 'lucide-react';

interface SkillsTableModalsProps {
    deleteCategoryTarget: { id: string; name: string } | null;
    onCloseCategoryDelete: () => void;
    onConfirmCategoryDelete: (id: string) => void;

    deleteSkillTarget: { categoryId: string; skillId: string; name: string } | null;
    onCloseSkillDelete: () => void;
    onConfirmSkillDelete: (categoryId: string, skillId: string) => void;

    infoModal: { title: string; content: string } | null;
    onCloseInfoModal: () => void;
}

export function SkillsTableModals({
    deleteCategoryTarget,
    onCloseCategoryDelete,
    onConfirmCategoryDelete,
    deleteSkillTarget,
    onCloseSkillDelete,
    onConfirmSkillDelete,
    infoModal,
    onCloseInfoModal
}: SkillsTableModalsProps) {
    return (
        <>
            {deleteCategoryTarget && (
                <div
                    className="skills-table__modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onCloseCategoryDelete();
                    }}
                >
                    <div className="skills-table__modal-content">
                        <h3
                            className="skills-table__modal-title modal-title-with-icon text-title-primary"
                            style={{ color: 'var(--semantic-danger)' }}
                        >
                            <AlertTriangle size={20} /> Confirm Deletion
                        </h3>
                        <p
                            className="skills-table__modal-text text-subtext"
                            style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}
                        >
                            Are you sure you want to delete the category &ldquo;{deleteCategoryTarget.name}&rdquo; and
                            all of its skills?
                        </p>
                        <div className="skills-table__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark skills-table__modal-btn text-theme-header"
                                onClick={onCloseCategoryDelete}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red skills-table__modal-btn text-theme-header"
                                onClick={() => onConfirmCategoryDelete(deleteCategoryTarget.id)}
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteSkillTarget && (
                <div
                    className="skills-table__modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onCloseSkillDelete();
                    }}
                >
                    <div className="skills-table__modal-content">
                        <h3
                            className="skills-table__modal-title modal-title-with-icon text-title-primary"
                            style={{ color: 'var(--semantic-danger)' }}
                        >
                            <AlertTriangle size={20} /> Confirm Deletion
                        </h3>
                        <p
                            className="skills-table__modal-text text-subtext"
                            style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}
                        >
                            Are you sure you want to delete the skill &ldquo;{deleteSkillTarget.name}&rdquo;?
                        </p>
                        <div className="skills-table__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark skills-table__modal-btn text-theme-header"
                                onClick={onCloseSkillDelete}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red skills-table__modal-btn text-theme-header"
                                onClick={() =>
                                    onConfirmSkillDelete(deleteSkillTarget.categoryId, deleteSkillTarget.skillId)
                                }
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {infoModal && (
                <div
                    className="skills-table__modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onCloseInfoModal();
                    }}
                >
                    <div
                        className="skills-table__modal-content"
                        style={{
                            border: '2px solid var(--primary)',
                            maxWidth: '360px',
                            textAlign: 'left'
                        }}
                    >
                        <h3
                            className="skills-table__modal-title modal-title-with-icon text-title-primary"
                            style={{ color: 'var(--primary)', justifyContent: 'flex-start' }}
                        >
                            <HelpCircle size={20} /> {infoModal.title}
                        </h3>
                        <p
                            className="skills-table__modal-text text-subtext"
                            style={{
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                lineHeight: '1.5',
                                margin: '12px 0 20px 0'
                            }}
                        >
                            {infoModal.content}
                        </p>
                        <div className="skills-table__modal-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark skills-table__modal-btn text-theme-header"
                                style={{ flex: 'none', padding: '6px 18px' }}
                                onClick={onCloseInfoModal}
                            >
                                <XCircle size={16} /> Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
