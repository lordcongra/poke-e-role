import type { RoomSettings } from '../../../../store/storeTypes';
import { flushRoomSettingsToOwlbear } from '../../../../utils/sync/obr';
import { isStandaloneMode } from '../../../../utils/sync/storageAdapter';

export const handleRoomSelectChange = <K extends keyof RoomSettings>(
    field: K,
    val: RoomSettings[K],
    e: React.ChangeEvent<HTMLSelectElement>,
    updateRoomSetting: (field: K, val: RoomSettings[K]) => void
) => {
    e.target.blur();
    updateRoomSetting(field, val);
    if (!isStandaloneMode) {
        flushRoomSettingsToOwlbear({ [field]: val }).catch(() => {});
    }
};
