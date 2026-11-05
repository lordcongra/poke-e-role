export type TreeItem = {
    id: string;
    name: string;
    parentId: string | null;
    type: 'folder' | 'character';
    meta?: Record<string, unknown>;
    activeTrans: string;
};

