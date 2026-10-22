import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import './GeneratorModal.css';

export interface GeneratorDrawerProps {
    id?: string;
    isOpen: boolean;
    onToggle: () => void;
    title: string;
    icon?: ReactNode;
    summary?: ReactNode;
    summaryVariant?: 'default' | 'active';
    children: ReactNode;
    className?: string;
}

export function GeneratorDrawer({
    id,
    isOpen,
    onToggle,
    title,
    icon,
    summary,
    summaryVariant = 'default',
    children,
    className = ''
}: GeneratorDrawerProps) {
    return (
        <div
            className={`generator-drawer ${isOpen ? 'generator-drawer--open' : ''} ${className}`}
            id={id}
        >
            <button
                type="button"
                className={`generator-drawer__header ${isOpen ? 'generator-drawer__header--open' : ''}`}
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                <div className="generator-drawer__header-left">
                    {icon && <span className="generator-drawer__icon">{icon}</span>}
                    <span className="generator-drawer__title text-title-primary">{title}</span>
                </div>
                <div className="generator-drawer__header-right">
                    {summary && (
                        <span
                            className={`generator-drawer__summary-pill text-subtext ${
                                summaryVariant === 'active' ? 'generator-drawer__summary-pill--active' : ''
                            }`}
                        >
                            {summary}
                        </span>
                    )}
                    <ChevronDown
                        className={`generator-drawer__chevron ${isOpen ? 'generator-drawer__chevron--open' : ''}`}
                        size={16}
                    />
                </div>
            </button>
            {isOpen && <div className="generator-drawer__content">{children}</div>}
        </div>
    );
}
