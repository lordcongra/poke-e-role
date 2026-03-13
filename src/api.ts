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

// --- LEARNSET PARSER ---
export function populateLearnset(pokemonData: any) {
    const container = document.getElementById('learnset-container');
    const toggleBtn = document.getElementById('toggle-learnset-btn');
    if (!container || !toggleBtn) return;

    if (!pokemonData || !pokemonData.Moves) {
        toggleBtn.style.display = 'none';
        container.style.display = 'none';
        return;
    }

    container.innerHTML = '';
    let hasMoves = false;

    const buildBadges = (moveArray: any[]) => {
        const moveList = document.createElement('div');
        moveList.style.display = 'flex';
        moveList.style.flexWrap = 'wrap';
        moveList.style.gap = '4px';
        moveArray.forEach((m: any) => {
            const moveName = typeof m === 'string' ? m : (m.Name || m.Move);
            if (moveName) {
                const moveBadge = document.createElement('span');
                moveBadge.style.background = '#e0e0e0';
                moveBadge.style.padding = '2px 6px';
                moveBadge.style.borderRadius = '12px';
                moveBadge.style.fontSize = '0.75rem';
                moveBadge.style.color = '#333';
                moveBadge.innerText = moveName;
                moveList.appendChild(moveBadge);
            }
        });
        return moveList;
    };

    let groupedMoves: Record<string, any[]> = {};
    const rankOrder = ["Starter", "Beginner", "Rookie", "Amateur", "Standard", "Advanced", "Expert", "Master", "Champion", "Other"];

    if (Array.isArray(pokemonData.Moves)) {
        pokemonData.Moves.forEach((m: any) => {
            const rank = typeof m === 'object' ? (m.Learned || m.Learn || m.Level || m.Rank || "Other") : "Other";
            if (!groupedMoves[rank]) groupedMoves[rank] = [];
            groupedMoves[rank].push(m);
        });
    } else if (typeof pokemonData.Moves === 'object') {
        groupedMoves = pokemonData.Moves;
    }

    const sortedRanks = Object.keys(groupedMoves).sort((a, b) => {
        let idxA = rankOrder.indexOf(a);
        let idxB = rankOrder.indexOf(b);
        if (idxA === -1) idxA = 99; 
        if (idxB === -1) idxB = 99;
        return idxA - idxB;
    });

    sortedRanks.forEach(rank => {
        const moveArray = groupedMoves[rank];
        if (Array.isArray(moveArray) && moveArray.length > 0) {
            hasMoves = true;
            const rankHeader = document.createElement('div');
            rankHeader.style.fontWeight = 'bold';
            rankHeader.style.color = 'var(--primary)';
            rankHeader.style.marginTop = container.innerHTML === '' ? '0px' : '8px';
            rankHeader.style.borderBottom = '1px solid #ccc';
            rankHeader.style.marginBottom = '4px';
            rankHeader.style.textTransform = 'capitalize';
            rankHeader.innerText = rank;
            
            container.appendChild(rankHeader);
            container.appendChild(buildBadges(moveArray));
        }
    });

    if (hasMoves) {
         toggleBtn.style.display = 'block';
    } else {
         toggleBtn.style.display = 'none';
         container.style.display = 'none';
    }
}