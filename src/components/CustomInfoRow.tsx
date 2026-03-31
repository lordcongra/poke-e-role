import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomInfo } from '../store/storeTypes';

interface CustomInfoRowProps {
    info: CustomInfo;
    onDelete: (id: string) => void;
}

export function CustomInfoRow({ info, onDelete }: CustomInfoRowProps) {
    const updateCustomInfo = useCharacterStore((state) => state.updateCustomInfo);

    return (
        <div className="identity-header__custom-info-row">
            <input
                type="text"
                value={info.label}
                onChange={(event) => updateCustomInfo(info.id, 'label', event.target.value)}
                placeholder="Label"
                className="identity-header__custom-info-label"
            />
            <input
                type="text"
                value={info.value}
                onChange={(event) => updateCustomInfo(info.id, 'value', event.target.value)}
                placeholder="Value"
                className="identity-header__custom-info-value"
            />
            <button
                type="button"
                onClick={() => onDelete(info.id)}
                className="action-button action-button--red identity-header__custom-info-delete"
            >
                X
            </button>
        </div>
    );
}
