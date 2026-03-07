export const GITHUB_TREE_URL = "https://api.github.com/repos/Pokerole-Software-Development/Pokerole-Data/git/trees/master?recursive=1";

export const MOVES_DB: Record<string, string> = {};
export const SPECIES_DB: Record<string, string> = {};
export const ABILITIES_DB: Record<string, string> = {};

export async function loadDatabaseLists() {
  const speciesInput = document.getElementById('species') as HTMLInputElement;
  if (!speciesInput) return;
  
  try {
    const response = await fetch(GITHUB_TREE_URL);
    if (!response.ok) return;
    const data = await response.json();

    const pokemonFiles = data.tree.filter((file: any) => 
      (file.path.includes("Version 3.0") || file.path.includes("v3.0")) && 
      (file.path.includes("/Pokemon/") || file.path.includes("/Pokedex/")) && 
      file.path.endsWith(".json")
    );

    const speciesDatalist = document.getElementById('species-list');
    let speciesHtml = '';
    pokemonFiles.forEach((file: any) => {
      const monName = file.path.split('/').pop().replace('.json', '');
      SPECIES_DB[monName] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
      speciesHtml += `<option value="${monName}"></option>`;
    });
    if (speciesDatalist) speciesDatalist.innerHTML = speciesHtml;

    const moveFiles = data.tree.filter((file: any) => 
      (file.path.includes("Version 3.0") || file.path.includes("v3.0")) && 
      file.path.includes("/Moves/") && 
      file.path.endsWith(".json")
    );

    const moveDatalist = document.getElementById('move-list');
    let datalistHtml = '';
    moveFiles.forEach((file: any) => {
      const moveName = file.path.split('/').pop().replace('.json', '');
      MOVES_DB[moveName.toLowerCase()] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
      datalistHtml += `<option value="${moveName}"></option>`;
    });
    if (moveDatalist) moveDatalist.innerHTML = datalistHtml;

    const abilityFiles = data.tree.filter((file: any) => 
      (file.path.includes("Version 3.0") || file.path.includes("v3.0")) && 
      file.path.includes("/Abilities/") && 
      file.path.endsWith(".json")
    );
    
    abilityFiles.forEach((file: any) => {
      const abName = file.path.split('/').pop().replace('.json', '');
      ABILITIES_DB[abName.toLowerCase()] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
    });

  } catch(err) {
    console.error("Error communicating with Github:", err);
  }
}

export async function fetchPokemonData(monName: string) {
  const selectedUrl = SPECIES_DB[monName];
  if (!selectedUrl) return null;
  try { const res = await fetch(selectedUrl); return await res.json(); } 
  catch (err) { return null; }
}

export async function fetchMoveData(moveName: string) {
  const selectedUrl = MOVES_DB[moveName.toLowerCase()];
  if (!selectedUrl) return null;
  try { const res = await fetch(selectedUrl); return await res.json(); } 
  catch (err) { return null; }
}

export async function fetchAbilityData(abilityName: string) {
  const selectedUrl = ABILITIES_DB[abilityName.toLowerCase()];
  if (!selectedUrl) return null;
  try { const res = await fetch(selectedUrl); return await res.json(); } 
  catch (err) { return null; }
}