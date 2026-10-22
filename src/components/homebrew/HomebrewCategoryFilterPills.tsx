import type { CategoryPillData } from './homebrewItemUtils';
import './HomebrewItems.css';

interface HomebrewCategoryFilterPillsProps {
    pills: CategoryPillData[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
}

export function HomebrewCategoryFilterPills({
    pills,
    selectedCategory,
    onSelectCategory
}: HomebrewCategoryFilterPillsProps) {
    if (pills.length <= 1) return null;

    return (
        <div className="homebrew-pills-row" role="tablist" aria-label="Category Filters">
            {pills.map((pill) => {
                const isActive = selectedCategory === pill.id;
                return (
                    <button
                        key={pill.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelectCategory(pill.id)}
                        className={`homebrew-pill ${isActive ? 'homebrew-pill--active' : ''}`}
                    >
                        <span>{pill.label}</span>
                        <span className="homebrew-pill__badge">{pill.count}</span>
                    </button>
                );
            })}
        </div>
    );
}
