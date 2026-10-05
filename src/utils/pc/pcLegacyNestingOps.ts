import { storageAdapter, type LocalCharacter, type LocalFolder } from '../sync/storageAdapter';

/**
 * Detects any character sheets that are nested directly inside another character sheet
 * (a legacy structure from older versions where sheets could be dropped into sheets).
 */
export function detectLegacyNestedCharacters(chars: LocalCharacter[], folders: LocalFolder[]): LocalCharacter[] {
    const folderIds = new Set(folders.map((f) => f.id));
    const charMap = new Map(chars.map((c) => [c.id, c]));

    return chars.filter((c) => c.parentId && !folderIds.has(c.parentId) && charMap.has(c.parentId));
}

/**
 * Cleans up any characters whose parentId points to an entity that no longer exists
 * (neither in folders nor in characters), resetting them safely to root.
 */
export async function cleanOrphanedCharacters(chars: LocalCharacter[], folders: LocalFolder[]): Promise<boolean> {
    const folderIds = new Set(folders.map((f) => f.id));
    const charIds = new Set(chars.map((c) => c.id));
    let anyFixed = false;

    for (const c of chars) {
        if (c.parentId && !folderIds.has(c.parentId) && !charIds.has(c.parentId)) {
            await storageAdapter.moveItem(c.id, null);
            c.parentId = null;
            anyFixed = true;
        }
    }

    return anyFixed;
}

export function getCharacterDisplayName(char: LocalCharacter): string {
    const name = char.name?.trim();
    if (name && name !== 'Unnamed Character') return name;

    const meta = (char.metadata || {}) as Record<string, unknown>;
    const nestedState = meta.state as Record<string, unknown> | undefined;
    const nestedIdentity = nestedState?.identity as Record<string, unknown> | undefined;

    const candidate =
        meta.nickname ||
        meta.name ||
        meta['character-name'] ||
        nestedIdentity?.nickname ||
        nestedIdentity?.name ||
        meta.species;

    const candidateStr = candidate ? String(candidate).trim() : '';
    return candidateStr && candidateStr !== 'Unnamed Character' ? candidateStr : 'Character';
}

/**
 * Auto-Folder Migration:
 * For every character sheet that has child sheets nested directly inside it,
 * automatically creates a dedicated sub-folder (e.g. "Ash's Sub-Sheets") under
 * that character and moves the nested child sheets inside the folder.
 * Preserves the exact hierarchy while ensuring all sheets are housed within folders.
 */
export async function executeAutoFolderLegacyNesting(
    chars: LocalCharacter[],
    folders: LocalFolder[]
): Promise<boolean> {
    const nestedChars = detectLegacyNestedCharacters(chars, folders);
    if (nestedChars.length === 0) return false;

    const charMap = new Map(chars.map((c) => [c.id, c]));
    const folderList = [...folders];

    // Find all unique parent character IDs that have nested child characters
    const parentIds = Array.from(new Set(nestedChars.map((c) => c.parentId!)));
    let anyMoved = false;

    for (const parentId of parentIds) {
        const parentChar = charMap.get(parentId);
        if (!parentChar) continue;

        const parentName = getCharacterDisplayName(parentChar);
        const folderName = `${parentName}'s Sub-Sheets`;

        // Check if a sub-sheets folder already exists directly under this parent
        let targetFolder = folderList.find(
            (f) => f.parentId === parentId && f.name.toLowerCase() === folderName.toLowerCase()
        );

        if (!targetFolder) {
            try {
                const newFolderId = await storageAdapter.createFolder(folderName, parentId);
                targetFolder = { id: newFolderId, name: folderName, parentId };
                folderList.push(targetFolder);
            } catch (err) {
                console.error(`[LegacyNestingOps] Failed to create folder for ${parentName}:`, err);
                continue;
            }
        }

        // Move all direct children of this parent into the target folder
        const directChildren = nestedChars.filter((c) => c.parentId === parentId);
        for (const child of directChildren) {
            try {
                await storageAdapter.moveItem(child.id, targetFolder.id);
                child.parentId = targetFolder.id;
                anyMoved = true;
            } catch (err) {
                console.error(`[LegacyNestingOps] Failed to move ${child.name} to folder:`, err);
            }
        }

        // Expand both the parent character and the newly created folder in the sidebar
        try {
            window.dispatchEvent(new CustomEvent('pkr-expand-sidebar-node', { detail: { id: parentId } }));
            window.dispatchEvent(new CustomEvent('pkr-expand-sidebar-node', { detail: { id: targetFolder.id } }));
        } catch {
            // Ignore in headless/SSR environments
        }
    }

    return anyMoved;
}

/**
 * Flatten Migration:
 * Unpacks all nested character sheets out into the main directory (or containing folder),
 * so that all character sheets exist on a single layer alongside their former parent sheet.
 */
export async function executeFlattenLegacyNesting(chars: LocalCharacter[], folders: LocalFolder[]): Promise<boolean> {
    const nestedChars = detectLegacyNestedCharacters(chars, folders);
    if (nestedChars.length === 0) return false;

    const charMap = new Map(chars.map((c) => [c.id, c]));
    const folderIds = new Set(folders.map((f) => f.id));
    let anyMoved = false;

    // Helper: traverse up character ancestors to find the highest non-character container (folder or null/root)
    const findFlattenTarget = (child: LocalCharacter): string | null => {
        const visited = new Set<string>();
        let current = child;

        while (current.parentId) {
            if (visited.has(current.id)) return null; // Break circular references
            visited.add(current.id);

            if (folderIds.has(current.parentId)) {
                // Parent is an actual folder!
                return current.parentId;
            }

            const parentChar = charMap.get(current.parentId);
            if (!parentChar) {
                // Parent does not exist
                return null;
            }

            current = parentChar;
        }

        return null; // Reached root
    };

    for (const child of nestedChars) {
        const targetParentId = findFlattenTarget(child);
        try {
            await storageAdapter.moveItem(child.id, targetParentId);
            child.parentId = targetParentId;
            anyMoved = true;
        } catch (err) {
            console.error(`[LegacyNestingOps] Failed to flatten ${child.name}:`, err);
        }
    }

    return anyMoved;
}
