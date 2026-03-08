import type { GithubTreeResponse, GithubTreeItem, PokemonData, MoveData, AbilityData } from './@types/index';

export const GITHUB_TREE_URL = "https://api.github.com/repos/Pokerole-Software-Development/Pokerole-Data/git/trees/master?recursive=1";

export const MOVES_URLS: Record<string, string> = {};
export const SPECIES_URLS: Record<string, string> = {};
export const ABILITIES_URLS: Record<string, string> = {};

export async function loadUrlLists(): Promise<void> {
  const speciesInput = document.getElementById('species') as HTMLInputElement | null;
  if (!speciesInput) return;
  
  try {
    const response = await fetch(GITHUB_TREE_URL);
    if (!response.ok) return;
    
    const data = (await response.json()) as GithubTreeResponse;

    const versionRegex = /(v|(version\s?))3\.0/i;
    const pokemonRegex = /\/(Pokemon|Pokedex)\//i;
    const moveRegex = /\/Moves\//i;
    const abilityRegex = /\/Abilities\//i;

    const pokemonFiles = data.tree.filter((file: GithubTreeItem) => 
      versionRegex.test(file.path) && pokemonRegex.test(file.path) && file.path.endsWith(".json")
    );

    const speciesDatalist = document.getElementById('species-list');
    let speciesHtml = '';
    pokemonFiles.forEach((file: GithubTreeItem) => {
      const monName = file.path.split('/').pop()?.replace('.json', '') || '';
      if (monName) {
        SPECIES_URLS[monName] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
        speciesHtml += `<option value="${monName}"></option>`;
      }
    });
    if (speciesDatalist) speciesDatalist.innerHTML = speciesHtml;

    const moveFiles = data.tree.filter((file: GithubTreeItem) => 
      versionRegex.test(file.path) && moveRegex.test(file.path) && file.path.endsWith(".json")
    );

    const moveDatalist = document.getElementById('move-list');
    let datalistHtml = '';
    moveFiles.forEach((file: GithubTreeItem) => {
      const moveName = file.path.split('/').pop()?.replace('.json', '') || '';
      if (moveName) {
        MOVES_URLS[moveName.toLowerCase()] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
        datalistHtml += `<option value="${moveName}"></option>`;
      }
    });
    if (moveDatalist) moveDatalist.innerHTML = datalistHtml;

    const abilityFiles = data.tree.filter((file: GithubTreeItem) => 
      versionRegex.test(file.path) && abilityRegex.test(file.path) && file.path.endsWith(".json")
    );
    
    abilityFiles.forEach((file: GithubTreeItem) => {
      const abName = file.path.split('/').pop()?.replace('.json', '') || '';
      if (abName) {
        ABILITIES_URLS[abName.toLowerCase()] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
      }
    });

  } catch(err) {
    console.error("Error communicating with Github:", err);
  }
}

export async function fetchPokemonData(monName: string): Promise<PokemonData | null> {
  const selectedUrl = SPECIES_URLS[monName];
  if (!selectedUrl) return null;
  try { const res = await fetch(selectedUrl); return (await res.json()) as PokemonData; } 
  catch (err) { return null; }
}

export async function fetchMoveData(moveName: string): Promise<MoveData | null> {
  const selectedUrl = MOVES_URLS[moveName.toLowerCase()];
  if (!selectedUrl) return null;
  try { const res = await fetch(selectedUrl); return (await res.json()) as MoveData; } 
  catch (err) { return null; }
}

export async function fetchAbilityData(abilityName: string): Promise<AbilityData | null> {
  const selectedUrl = ABILITIES_URLS[abilityName.toLowerCase()];
  if (!selectedUrl) return null;
  try { const res = await fetch(selectedUrl); return (await res.json()) as AbilityData; } 
  catch (err) { return null; }
}