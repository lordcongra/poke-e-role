import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import './UI.css';

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
                <span
                    className="collapsing-section__title-wrapper"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <button
                        type="button"
                        className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ChevronDown size={18} />
                    </button>
                    {title}
                </span>
                {headerElements}
            </div>
            {!isCollapsed && <div className="panel-content-wrapper">{children}</div>}
        </div>
    );
}
