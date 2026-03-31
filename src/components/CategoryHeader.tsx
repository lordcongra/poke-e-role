import type { ReactNode } from 'react';
import './CategoryHeader.css';

interface CategoryHeaderProps {
    title: ReactNode;
}

export function CategoryHeader({ title }: CategoryHeaderProps) {
    return (
        <tr className="category-header__row">
            <th className="category-header__title">{title}</th>
            <th>Base</th>
            <th>Buff</th>
            <th>Total</th>
        </tr>
    );
}