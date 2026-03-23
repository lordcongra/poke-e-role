export const RANK_CAPS: Record<string, { attr: number, soc: number, skill: number, skillLimit: number }> = {
    "Starter":  { attr: 0, soc: 0, skill: 5, skillLimit: 1 },
    "Rookie":   { attr: 2, soc: 2, skill: 10, skillLimit: 2 },
    "Standard": { attr: 4, soc: 4, skill: 14, skillLimit: 3 },
    "Advanced": { attr: 6, soc: 6, skill: 17, skillLimit: 4 },
    "Expert":   { attr: 8, soc: 8, skill: 19, skillLimit: 5 },
    "Ace":      { attr: 10, soc: 10, skill: 20, skillLimit: 5 },
    "Master":   { attr: 10, soc: 10, skill: 22, skillLimit: 5 },
    "Champion": { attr: 14, soc: 14, skill: 25, skillLimit: 5 }
};

export const AGE_CAPS: Record<string, { attr: number, soc: number }> = {
    "--":       { attr: 0, soc: 0 },
    "Child":    { attr: 0, soc: 0 },
    "Teen":     { attr: 2, soc: 2 },
    "Adult":    { attr: 4, soc: 4 },
    "Senior":   { attr: 3, soc: 6 }
};

export const RANK_HIERARCHY = ["Starter", "Beginner", "Rookie", "Amateur", "Standard", "Advanced", "Expert", "Ace", "Master", "Champion"];

export interface TempMove {
    id: string;
    name: string;
    attr: string;
    skill: string;
    type: string;
    cat: string;
    dmgStat: string;
    power: number;
    desc: string;
}

export interface TempBuild {
    species: string;
    attr: Record<string, number>;
    soc: Record<string, number>;
    skills: Record<string, number>;
    customSkillsList: string[];
    customSkillMap: Record<string, string>;
    moves: TempMove[];
    maxMoves: number;
}

// A shared state object so the UI can hold onto the build before applying it!
export const genState: { currentTempBuild: TempBuild | null } = { 
    currentTempBuild: null 
};