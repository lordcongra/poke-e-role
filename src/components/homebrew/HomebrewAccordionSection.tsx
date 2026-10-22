import { ChevronDown } from 'lucide-react';
import type { CustomItem } from '../../store/storeTypes';
import { HomebrewItemCard } from './HomebrewItemCard';
import './HomebrewItems.css';

interface HomebrewAccordionSectionProps {
    title: string;
    items: CustomItem[];
    isOpen: boolean;
    onToggle: () => void;
    role: string;
    canEdit: boolean;
    onRemoveItem: (id: string) => void;
    onDuplicateItem: (id: string) => void;
}

export function HomebrewAccordionSection({
    title,
    items,
    isOpen,
    onToggle,
    role,
    canEdit,
    onRemoveItem,
    onDuplicateItem
}: HomebrewAccordionSectionProps) {
    return (
        <div className="homebrew-accordion-group">
            <button
                type="button"
                className={`homebrew-accordion-header ${isOpen ? 'homebrew-accordion-header--open' : ''}`}
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                <div className="homebrew-accordion-header__title-area">
                    <span className={`homebrew-accordion-chevron ${isOpen ? 'homebrew-accordion-chevron--open' : ''}`}>
                        <ChevronDown size={16} />
                    </span>
                    <span className="homebrew-accordion-title text-title-primary">{title}</span>
                </div>
                <span className="homebrew-accordion-badge">{items.length}</span>
            </button>

            {isOpen && (
                <div className="homebrew-accordion-body">
                    {items.map((item) => (
                        <HomebrewItemCard
                            key={item.id}
                            item={item}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => onRemoveItem(item.id)}
                            onDuplicate={() => onDuplicateItem(item.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
