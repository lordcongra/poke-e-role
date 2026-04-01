import type { StateCreator } from 'zustand';
import type { CharacterState, ExtraSkillsSlice, ExtraCategory } from '../storeTypes';
import { saveToOwlbear } from '../../utils/obr';

export const createExtraSkillsSlice: StateCreator<CharacterState, [], [], ExtraSkillsSlice> = (set) => ({
    extraCategories: [],

    addExtraCategory: () =>
        set((state) => {
            const categoryId = `cat_${crypto.randomUUID()}`;
            const newCategories: ExtraCategory[] = [
                ...state.extraCategories,
                {
                    id: categoryId,
                    name: 'EXTRA',
                    skills: [
                        { id: `${categoryId}_1`, name: '', base: 0, buff: 0 },
                        { id: `${categoryId}_2`, name: '', base: 0, buff: 0 },
                        { id: `${categoryId}_3`, name: '', base: 0, buff: 0 },
                        { id: `${categoryId}_4`, name: '', base: 0, buff: 0 }
                    ]
                }
            ];
            try {
                saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCategories) });
            } catch (error) {
                console.error(error);
            }
            return { extraCategories: newCategories };
        }),

    updateExtraCategory: (id, name) =>
        set((state) => {
            const newCategories = state.extraCategories.map((category) =>
                category.id === id ? { ...category, name } : category
            );
            try {
                saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCategories) });
            } catch (error) {
                console.error(error);
            }
            return { extraCategories: newCategories };
        }),

    updateExtraSkill: (categoryId, skillId, field, value) =>
        set((state) => {
            const newCategories = state.extraCategories.map((category) => {
                if (category.id === categoryId) {
                    return {
                        ...category,
                        skills: category.skills.map((skill) =>
                            skill.id === skillId ? { ...skill, [field]: value } : skill
                        )
                    };
                }
                return category;
            });
            try {
                saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCategories) });
            } catch (error) {
                console.error(error);
            }
            return { extraCategories: newCategories };
        }),

    removeExtraCategory: (id) =>
        set((state) => {
            const newCategories = state.extraCategories.filter((category) => category.id !== id);
            try {
                saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCategories) });
            } catch (error) {
                console.error(error);
            }
            return { extraCategories: newCategories };
        })
});
