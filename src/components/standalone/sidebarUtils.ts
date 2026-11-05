import type { LocalCharacter, LocalFolder } from '@/utils/sync/storageAdapter';
import type { TreeItem } from './sidebarTypes';

export function buildTreeItems(
    chars: LocalCharacter[],
    flds: LocalFolder[],
    customOrder: string[]
): TreeItem[] {
    const orderMap = new Map<string, number>();
    customOrder.forEach((id, index) => orderMap.set(id, index));

    const combined: TreeItem[] = [
        ...flds.map((f) => ({
            id: f.id,
            name: f.name,
            parentId: f.parentId,
            type: 'folder' as const,
            activeTrans: 'None'
        })),
        ...chars.map((c) => {
            const metaObj = c.metadata as Record<string, unknown> | undefined;
            const nestedState = metaObj?.state as Record<string, unknown> | undefined;
            const nestedIdentity = nestedState?.identity as Record<string, unknown> | undefined;

            const currentTrans = String(
                metaObj?.['active-transformation'] || nestedIdentity?.activeTransformation || 'None'
            );

            return {
                id: c.id,
                name: c.name,
                parentId: c.parentId,
                type: 'character' as const,
                meta: metaObj,
                activeTrans: currentTrans
            };
        })
    ];

    combined.sort((a, b) => {
        const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
        const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
        if (indexA !== indexB) return indexA - indexB;
        return a.name.localeCompare(b.name);
    });

    return combined;
}

export function parseStandaloneInitTags(savedList: string | null): Record<string, string> {
    if (!savedList) return {};
    try {
        const list = JSON.parse(savedList) as { id: string; name: string }[];
        if (!Array.isArray(list)) return {};

        const nameGroups: Record<string, string[]> = {};
        list.forEach((c) => {
            if (c?.name && c?.id) {
                if (!nameGroups[c.name]) nameGroups[c.name] = [];
                nameGroups[c.name].push(c.id);
            }
        });

        Object.values(nameGroups).forEach((ids) => ids.sort());

        const newTags: Record<string, string> = {};
        list.forEach((c) => {
            if (!c?.name || !c?.id) return;
            const ids = nameGroups[c.name];
            if (ids && ids.length > 1) {
                newTags[c.id] = `#${ids.indexOf(c.id) + 1}`;
            } else {
                newTags[c.id] = 'init_active';
            }
        });
        return newTags;
    } catch (e) {
        console.error('[SidebarEngine] Failed to parse initiative list for tags', e);
        return {};
    }
}

