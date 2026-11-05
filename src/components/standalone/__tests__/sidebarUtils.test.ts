import { describe, it, expect } from 'vitest';
import { buildTreeItems, parseStandaloneInitTags } from '../sidebarUtils';
import type { LocalCharacter, LocalFolder } from '@/utils/sync/storageAdapter';

describe('sidebarUtils', () => {
    describe('buildTreeItems', () => {
        it('maps folders and characters and applies custom order and alphabetical sorting', () => {
            const flds: LocalFolder[] = [
                { id: 'fld-2', name: 'Z-Folder', parentId: null },
                { id: 'fld-1', name: 'A-Folder', parentId: null }
            ];
            const chars: LocalCharacter[] = [
                {
                    id: 'char-1',
                    name: 'Charizard',
                    parentId: 'fld-1',
                    metadata: {
                        'active-transformation': 'Mega X'
                    }
                },
                {
                    id: 'char-2',
                    name: 'Blastoise',
                    parentId: null,
                    metadata: {
                        state: {
                            identity: {
                                activeTransformation: 'Mega'
                            }
                        }
                    }
                }
            ];

            // Order fld-1 first, then char-2
            const customOrder = ['fld-1', 'char-2'];
            const items = buildTreeItems(chars, flds, customOrder);

            expect(items).toHaveLength(4);
            expect(items[0].id).toBe('fld-1');
            expect(items[1].id).toBe('char-2');
            expect(items[1].activeTrans).toBe('Mega');

            // Remaining items sorted alphabetically: Charizard before Z-Folder
            expect(items[2].id).toBe('char-1');
            expect(items[2].activeTrans).toBe('Mega X');
            expect(items[3].id).toBe('fld-2');
        });
    });

    describe('parseStandaloneInitTags', () => {
        it('returns empty object for empty or invalid input', () => {
            expect(parseStandaloneInitTags(null)).toEqual({});
            expect(parseStandaloneInitTags('')).toEqual({});
            expect(parseStandaloneInitTags('invalid json')).toEqual({});
        });

        it('assigns init_active for single combatants and numbered tags for duplicates', () => {
            const savedList = JSON.stringify([
                { id: 'c-1', name: 'Pikachu' },
                { id: 'c-2', name: 'Charmander' },
                { id: 'c-3', name: 'Pikachu' }
            ]);

            const tags = parseStandaloneInitTags(savedList);

            expect(tags['c-2']).toBe('init_active');
            // Duplicate Pikachus should be tagged with #1 and #2 based on id sort order
            expect(tags['c-1']).toBe('#1');
            expect(tags['c-3']).toBe('#2');
        });
    });
});

