interface ItemInfoModalProps {
    infoModal: { title: string; desc: string };
    onClose: () => void;
}

export function ItemInfoModal({ infoModal, onClose }: ItemInfoModalProps) {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 1100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <div
                style={{
                    background: 'var(--panel-bg)',
                    padding: '15px',
                    borderRadius: '8px',
                    width: '300px',
                    border: '2px solid #C62828',
                    color: 'var(--text-main)'
                }}
            >
                <h3
                    style={{
                        marginTop: 0,
                        color: '#C62828',
                        fontSize: '1.1rem',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '4px',
                        textAlign: 'center'
                    }}
                >
                    {infoModal.title}
                </h3>
                <p
                    style={{
                        fontSize: '0.85rem',
                        marginBottom: '15px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '250px',
                        overflowY: 'auto'
                    }}
                >
                    {infoModal.desc}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        className="action-button action-button--dark"
                        style={{ width: '100%', padding: '6px' }}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
