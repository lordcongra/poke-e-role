import type { ReactNode } from 'react';

interface CategoryHeaderProps {
    title: ReactNode;
}

export function CategoryHeader({ title }: CategoryHeaderProps) {
    return (
        <tr style={{ background: '#C62828', color: 'white' }}>
            <th style={{ textAlign: 'left', paddingLeft: '6px' }}>{title}</th>
            <th>Base</th>
            <th>Buff</th>
            <th>Total</th>
        </tr>
    );
}
