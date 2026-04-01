export function TooltipIcon({ onClick }: { onClick: () => void }) {
    return (
        <span
            onClick={onClick}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#555',
                color: 'white',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '11px',
                cursor: 'pointer',
                marginLeft: '6px',
                fontWeight: 'bold'
            }}
        >
            ?
        </span>
    );
}
