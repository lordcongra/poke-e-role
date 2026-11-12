import { AlertTriangle } from 'lucide-react';
import type {
    CustomType,
    CustomAbility,
    CustomMove,
    CustomPokemon,
    CustomItem,
    CustomForm,
    CustomStatus,
    CustomFieldEffect
} from '@/store/storeTypes';

export interface HomebrewImportPayload {
    types: CustomType[];
    abs: CustomAbility[];
    moves: CustomMove[];
    mons: CustomPokemon[];
    items: CustomItem[];
    forms: CustomForm[];
    statuses: CustomStatus[];
    fieldEffects: CustomFieldEffect[];
}

interface HomebrewImportConfirmModalProps {
    data: HomebrewImportPayload;
    onCancel: () => void;
    onMerge: (data: HomebrewImportPayload) => void;
    onOverwrite: (data: HomebrewImportPayload) => void;
}

export function HomebrewImportConfirmModal({
    data,
    onCancel,
    onMerge,
    onOverwrite
}: HomebrewImportConfirmModalProps) {
    return (
        <div className="homebrew-import__overlay">
            <div className="homebrew-import__content">
                <h3
                    className="homebrew-import__title text-title-primary"
                    style={{
                        color: 'var(--semantic-danger)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <AlertTriangle size={20} /> Confirm Restore
                </h3>
                <p className="homebrew-import__text text-subtext">
                    How would you like to import this data? <b>Overwrite</b> will delete all existing Workshop items.{' '}
                    <b>Add / Merge</b> will safely combine them, updating any items with matching names.
                </p>
                <div className="homebrew-import__actions">
                    <button onClick={onCancel} className="action-button action-button--dark homebrew-import__btn">
                        Cancel
                    </button>
                    <button
                        onClick={() => onMerge(data)}
                        className="action-button action-button--secondary homebrew-import__btn"
                    >
                        Add / Merge
                    </button>
                    <button
                        onClick={() => onOverwrite(data)}
                        className="action-button action-button--red homebrew-import__btn"
                    >
                        Overwrite
                    </button>
                </div>
            </div>
        </div>
    );
}

