import type { StateCreator } from 'zustand';
import type { CharacterState, ExtraSkillsSlice, ExtraCategory } from '../storeTypes';
import { saveToOwlbear } from '../../utils/sync/obr';

export const createExtraSkillsSlice: StateCreator<CharacterState, [], [], ExtraSkillsSlice> = (set) => ({
    extraCategories: [],

    addExtraCategory: (name = 'EXTRA') =>
        set((state) => {
            const categoryId = `cat_${crypto.randomUUID()}`;
            const newCategories: ExtraCategory[] = [
                ...state.extraCategories,
                {
                    id: categoryId,
                    name: name || 'EXTRA',
                    skills: [{ id: `${categoryId}_1`, name: '', base: 0, buff: 0 }]
                }
            ];
            try {
                saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCategories) });
            } catch (error) {
                console.error('[ExtraSkillsSlice] Failed to save new extra category to Owlbear.', error);
            }
            return { extraCategories: newCategories };
        }),

    addExtraSkill: (categoryId?: string) =>
        set((state) => {
            let newCategories = [...state.extraCategories];
            const newSkillId = `skill_${crypto.randomUUID().slice(0, 8)}`;
            const newSkill = { id: newSkillId, name: '', base: 0, buff: 0 };

            if (newCategories.length === 0) {
                const newCatId = `cat_${crypto.randomUUID()}`;
                newCategories = [
                    {
                        id: newCatId,
                        name: 'EXTRA',
                        skills: [newSkill]
                    }
                ];
            } else {
                const targetId = categoryId || newCategories[newCategories.length - 1].id;
                newCategories = newCategories.map((cat) => {
                    if (cat.id === targetId) {
                        return {
                            ...cat,
                            skills: [...cat.skills, newSkill]
                        };
                    }
                    return cat;
                });
            }

            try {
                saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCategories) });
            } catch (error) {
                console.error('[ExtraSkillsSlice] Failed to save added extra skill to Owlbear.', error);
            }
            return { extraCategories: newCategories };
        }),

    removeExtraSkill: (categoryId, skillId) =>
        set((state) => {
            const newCategories = state.extraCategories.map((category) => {
                if (category.id === categoryId) {
                    return {
                        ...category,
                        skills: category.skills.filter((skill) => skill.id !== skillId)
                    };
                }
                return category;
            });
            try {
                saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCategories) });
            } catch (error) {
                console.error('[ExtraSkillsSlice] Failed to save removed extra skill to Owlbear.', error);
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
                console.error('[ExtraSkillsSlice] Failed to save updated extra category to Owlbear.', error);
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
                console.error('[ExtraSkillsSlice] Failed to save updated extra skill to Owlbear.', error);
            }
            return { extraCategories: newCategories };
        }),

    removeExtraCategory: (id) =>
        set((state) => {
            const newCategories = state.extraCategories.filter((category) => category.id !== id);
            try {
                saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCategories) });
            } catch (error) {
                console.error('[ExtraSkillsSlice] Failed to save removed extra category to Owlbear.', error);
            }
            return { extraCategories: newCategories };
        })
});
