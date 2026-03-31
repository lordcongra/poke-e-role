export function SmartTagsGuideModal({ onClose }: { onClose: () => void }) {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.6)',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontFamily: 'sans-serif'
            }}
        >
            <div
                style={{
                    background: 'var(--panel-bg)',
                    padding: '15px',
                    borderRadius: '8px',
                    width: '340px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    border: '2px solid var(--primary)',
                    color: 'var(--text-main)'
                }}
            >
                <h3
                    style={{
                        marginTop: 0,
                        color: 'var(--primary)',
                        fontSize: '1.1rem',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '4px',
                        textAlign: 'center'
                    }}
                >
                    🏷️ Smart Tags Guide
                </h3>
                <p
                    style={{
                        fontSize: '0.8rem',
                        marginBottom: '10px',
                        color: 'var(--text-muted)',
                        textAlign: 'center'
                    }}
                >
                    Type these exactly as shown (with brackets) into an equipped item's Name or Notes to automatically
                    apply mechanics.
                </p>
                <ul
                    style={{
                        fontSize: '0.8rem',
                        paddingLeft: '20px',
                        marginBottom: '15px',
                        lineHeight: '1.6',
                        color: 'var(--text-main)'
                    }}
                >
                    <li>
                        <b>Stats/Skills:</b> <code>[Dex -2]</code>, <code>[Brawl +2]</code>, <code>[Def +1]</code>,{' '}
                        <code>[Spd +1]</code>
                    </li>
                    <li>
                        <b>Combat:</b> <code>[Dmg +1]</code>, <code>[Dmg +1: Physical]</code>, <code>[Acc +1]</code>,{' '}
                        <code>[Chance +2]</code>
                    </li>
                    <li>
                        <b>Matchups:</b> <code>[Immune: Ground]</code>, <code>[Remove Immunity: Type]</code>,{' '}
                        <code>[Remove Immunities]</code>
                    </li>
                    <li>
                        <b>Mechanics:</b> <code>[High Crit]</code>, <code>[Ignore Low Acc 2]</code>,{' '}
                        <code>[Status: Poison]</code>, <code>[Recoil]</code>
                    </li>
                </ul>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark"
                        style={{ width: '100%', padding: '6px' }}
                    >
                        Close Guide
                    </button>
                </div>
            </div>
        </div>
    );
}
