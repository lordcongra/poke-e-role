import { useState } from 'react';
import type { ReactNode } from 'react';

interface CollapsingSectionProps {
    title: ReactNode;
    children: ReactNode;
    defaultCollapsed?: boolean;
    headerElements?: ReactNode;
    className?: string;
}

export function CollapsingSection({
    title,
    children,
    defaultCollapsed = false,
    headerElements,
    className = 'sheet-panel'
}: CollapsingSectionProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    return (
        <div className={className}>
            <div className="sheet-panel__header">
                <span className="flex-layout--row-center" style={{ gap: '4px', flexShrink: 0 }}>
                    <button
                        type="button"
                        className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        ▼
                    </button>
                    {title}
                </span>
                {headerElements}
            </div>
            {!isCollapsed && <div className="panel-content-wrapper">{children}</div>}
        </div>
    );
}
