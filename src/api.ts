import type { GithubTreeResponse, GithubTreeItem, PokemonData, MoveData, AbilityData } from './@types/index';

export const GITHUB_TREE_URL = "https://api.github.com/repos/Pokerole-Software-Development/Pokerole-Data/git/trees/master?recursive=1";

export const MOVES_URLS: Record<string, string> = {};
export const SPECIES_URLS: Record<string, string> = {};
export const ABILITIES_URLS: Record<string, string> = {};
export const ITEMS_URLS: Record<string, string> = {};
export const ALL_ABILITIES: string[] = []; 

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
    const itemRegex = /\/(Items|Equipment)\//i;

    const pokemonFiles = data.tree.filter((file: GithubTreeItem) => 
      versionRegex.test(file.path) && pokemonRegex.test(file.path) && file.path.endsWith(".json")
    );

    const speciesDatalist = document.getElementById('species-list');
    if (speciesDatalist) {
        speciesDatalist.innerHTML = ''; // Safe clear
        pokemonFiles.forEach((file: GithubTreeItem) => {
            const monName = file.path.split('/').pop()?.replace('.json', '') || '';
            if (monName) {
                SPECIES_URLS[monName] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
                const opt = document.createElement('option');
                opt.value = monName;
                speciesDatalist.appendChild(opt);
            }
        });
    }

    const moveFiles = data.tree.filter((file: GithubTreeItem) => 
      versionRegex.test(file.path) && moveRegex.test(file.path) && file.path.endsWith(".json")
    );

    const moveDatalist = document.getElementById('move-list');
    if (moveDatalist) {
        moveDatalist.innerHTML = '';
        moveFiles.forEach((file: GithubTreeItem) => {
            const moveName = file.path.split('/').pop()?.replace('.json', '') || '';
            if (moveName) {
                MOVES_URLS[moveName.toLowerCase()] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
                const opt = document.createElement('option');
                opt.value = moveName;
                moveDatalist.appendChild(opt);
            }
        });
    }

    const abilityFiles = data.tree.filter((file: GithubTreeItem) => 
      versionRegex.test(file.path) && abilityRegex.test(file.path) && file.path.endsWith(".json")
    );
    
    const abilityDatalist = document.getElementById('ability-list');
    if (abilityDatalist) {
        abilityDatalist.innerHTML = '';
        abilityFiles.forEach((file: GithubTreeItem) => {
            const abName = file.path.split('/').pop()?.replace('.json', '') || '';
            if (abName) {
                ABILITIES_URLS[abName.toLowerCase()] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
                if (!ALL_ABILITIES.includes(abName)) ALL_ABILITIES.push(abName); 
                const opt = document.createElement('option');
                opt.value = abName;
                abilityDatalist.appendChild(opt);
            }
        });
    }

    // --- ITEM FETCHING LOGIC ---
    const itemFiles = data.tree.filter((file: GithubTreeItem) => 
        versionRegex.test(file.path) && itemRegex.test(file.path) && file.path.endsWith(".json")
    );
    
    const itemDatalist = document.getElementById('item-list');
    if (itemDatalist) {
        itemDatalist.innerHTML = '';
        itemFiles.forEach((file: GithubTreeItem) => {
            const itemName = file.path.split('/').pop()?.replace('.json', '') || '';
            if (itemName) {
                ITEMS_URLS[itemName.toLowerCase()] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
                const opt = document.createElement('option');
                opt.value = itemName;
                itemDatalist.appendChild(opt);
            }
        });
    }

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

export async function fetchItemData(itemName: string): Promise<Record<string, unknown> | null> {
    const selectedUrl = ITEMS_URLS[itemName.toLowerCase()];
    if (!selectedUrl) return null;
    try { const res = await fetch(selectedUrl); return (await res.json()) as Record<string, unknown>; } 
    catch (err) { return null; }
}

export function populateLearnset(pokemonData: PokemonData | Record<string, unknown>) {
    const container = document.getElementById('learnset-container');
    const toggleBtn = document.getElementById('toggle-learnset-btn');
    if (!container || !toggleBtn) return;

    const pd = pokemonData as Record<string, unknown>;

    if (!pd || !pd.Moves) {
        toggleBtn.style.display = 'none';
        container.style.display = 'none';
        return;
    }

    container.innerHTML = '';
    let hasMoves = false;

    const buildBadges = (moveArray: unknown[]) => {
        const moveList = document.createElement('div');
        moveList.style.display = 'flex';
        moveList.style.flexWrap = 'wrap';
        moveList.style.gap = '4px';
        
        moveArray.forEach((m: unknown) => {
            let moveName = "";
            if (typeof m === 'string') moveName = m;
            else if (m && typeof m === 'object') {
                const mObj = m as Record<string, unknown>;
                moveName = String(mObj.Name || mObj.Move || "");
            }

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

    let groupedMoves: Record<string, unknown[]> = {};
    const rankOrder = ["Starter", "Beginner", "Rookie", "Amateur", "Standard", "Advanced", "Expert", "Master", "Champion", "Other"];

    if (Array.isArray(pd.Moves)) {
        pd.Moves.forEach((m: unknown) => {
            let rank = "Other";
            if (m && typeof m === 'object') {
                const mObj = m as Record<string, unknown>;
                rank = String(mObj.Learned || mObj.Learn || mObj.Level || mObj.Rank || "Other");
            }
            if (!groupedMoves[rank]) groupedMoves[rank] = [];
            groupedMoves[rank].push(m);
        });
    } else if (typeof pd.Moves === 'object' && pd.Moves !== null) {
        groupedMoves = pd.Moves as Record<string, unknown[]>;
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