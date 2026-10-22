/**
 * Pokerole GM Screen - Typeless Maneuvers Data
 * Core reference for battle maneuvers available to Pokémon and Humans.
 */

export interface ManeuverData {
    id: string;
    name: string;
    type: 'None';
    category: 'Support' | 'Physical/Special';
    power: string;
    accuracy: string;
    damagePool: string;
    target: string;
    reaction?: string;
    reactionSpeed?: number;
    addedEffect: string;
    flavor: string;
    icon?: string;
    note?: string;
    description?: string;
    example?: { scenario: string; roll: string };
    ifSuccessful?: string[];
    cannotBeUsedAgainst?: { title: string; items: string[] };
    actionEconomyNote?: string;
    additionalNotes?: string[];
}

export const MANEUVERS_CORE_RULES = {
    title: 'Typeless Maneuvers Core Rules',
    summary:
        'Not every attack is a Move. Simple Typeless Maneuvers don’t consume energy and are not bound by type weakness, resistance, or immunities.',
    rules: [
        'Once per Round: Each Maneuver can only be used once per Round by a character.',
        'CANNOT Clash nor be Clashed: Maneuvers can NEVER be used to Clash against an opponent, nor can an opponent Clash against a Maneuver! (This is why Struggle cannot be used to Clash).',
        'Action Economy Exception: Evasion and Clash are NOT affected by the Multiple Action difficulty chart (they can be your 1st or 5th action). However, they consume one Action even if unsuccessful.',
        'Typeless Damage: Maneuvers that deal damage (like Struggle) inflict Typeless Damage, ignoring type charts.',
        'Universal Access: Since anyone can perform them, both Humans and Pokémon can use maneuvers to enrich their strategy in and out of combat.',
        'Feel Free to Create Your Own: Storytellers and players can invent custom typeless maneuvers suited to their narrative.'
    ]
};

export const CORE_MANEUVERS_DATA: ManeuverData[] = [
    {
        id: 'maneuver-ambush',
        name: 'Ambush',
        type: 'None',
        category: 'Support',
        power: '—',
        accuracy: 'Dexterity + Stealth',
        damagePool: '—',
        target: 'Single Target',
        addedEffect:
            'Before the Battle starts, Target may resist by rolling: Insight + Alert and scoring the same or more successes. The User has 1 Action before Initiatives are rolled in which the Target can’t act. Other foes can still Evade or Clash during this time.',
        flavor: 'Sneak through the shadows, keep low to the ground and prepare to pounce on an unsuspecting foe.'
    },
    {
        id: 'maneuver-clash',
        name: 'Clash',
        type: 'None',
        category: 'Support',
        power: '—',
        accuracy: 'Strength/Special + Clash',
        damagePool: '—',
        target: 'Target Self',
        reaction: 'Reaction 6 (↑6)',
        reactionSpeed: 6,
        addedEffect:
            'Match the number of successes on the Accuracy roll of a Move that targets the User. If successful, the user Clashes. This Maneuver is NOT affected by the Multiple Action difficulty chart.',
        flavor: 'A power struggle can become a clash of mights, usually with explosive results.',
        description:
            'Performing a Clash means you use a Physical or Special Move to try to deflect your foe’s Attack, resulting in both energies clashing and creating a small explosion that reduces the full force of the attack but may damage both parties.',
        example: {
            scenario:
                "Eevee lunges against Pikachu with a Tackle! Pikachu braces for the impact and uses Thundershock to clash Eevee's Tackle!",
            roll: 'Thundershock is a Special Move, so, for Clash Pikachu would have to roll: Special + Clash, and match or surpass the number of successes Eevee got on their Accuracy roll for Tackle.'
        },
        ifSuccessful: [
            'Clash Damage deals 1 damage to both Pokémon.',
            'Type Resistance / Weakness applies.',
            'Clashing counts as using a Move for the Round.',
            'Clashing does not activate Added Effects on the Move used to clash nor the one used to hit.',
            'Since Physical or Special Moves are used, some Abilities may be triggered by this.'
        ],
        cannotBeUsedAgainst: {
            title: 'Certain Moves cannot be Clashed, such as:',
            items: [
                'Moves that use a Social Attribute on their Accuracy Roll.',
                'Support Moves.',
                'Moves that ignore Defenses / have Set Damage.',
                'Maneuvers (e.g. Struggle).',
                'Moves that Target the Battlefield.',
                'Area Moves can only be clashed by another Area Move.'
            ]
        },
        actionEconomyNote:
            'Evasion and Clash are not affected by the Multiple Action difficulty chart (they can be your 1st or 5th action). However, they consume one Action even if unsuccessful.',
        note: 'Requires using a Move to contest power. Humans cannot Clash because Struggle is a Maneuver, not a Move.',
        additionalNotes: [
            'Requires using a Physical or Special Move to contest power. Humans cannot Clash because Struggle is a Maneuver, not a Move.'
        ]
    },
    {
        id: 'maneuver-cover-an-ally',
        name: 'Cover an Ally',
        type: 'None',
        category: 'Support',
        power: '—',
        accuracy: 'Will',
        damagePool: '—',
        target: 'Target One Ally',
        reaction: 'Reaction 1 (↑1)',
        reactionSpeed: 1,
        addedEffect:
            'The User will become the target to incoming attacks towards the Target. This Cover lasts until the User’s Next Turn or until the Target uses a Non-Ranged Physical Move. Pokémon with Loyalty 2 or less won’t use this Maneuver.',
        flavor: 'Use your body as a shield to protect your friends! Not even 100 Spearows will go through you!'
    },
    {
        id: 'maneuver-evasion',
        name: 'Evasion',
        type: 'None',
        category: 'Support',
        power: '—',
        accuracy: 'Dexterity + Evasion',
        damagePool: '—',
        target: 'Target Self',
        reaction: 'Reaction 6 (↑6)',
        reactionSpeed: 6,
        addedEffect:
            'Match the number of successes on the Accuracy roll of a Move that targets the User. If successful, the user Evades. This Maneuver is NOT affected by the Multiple Action difficulty chart.',
        flavor: 'No time to think! If you hear "Doooooodge!" You get out of the way A.S.A.P.',
        description:
            'Performing an Evasion means to get out of the path of danger and/or the blast radius of a Move. Dodging out of harm’s way and effectively reducing all potential damage taken to zero.',
        example: {
            scenario:
                'Eevee lunges against Pikachu with a Tackle! But Pikachu jumps backwards just as Eevee runs in their direction!',
            roll: 'To Evade, Pikachu would have to roll: Dexterity + Evasion, and match or surpass the number of successes Eevee got on their Accuracy roll for Tackle.'
        },
        ifSuccessful: [
            'A successful Evasion means the Pokémon got away from their foe’s reach, thus, taking no damage nor effects from the Move targeting them. All this at the cost of one of its actions.'
        ],
        cannotBeUsedAgainst: {
            title: 'Certain Moves cannot be Evaded, such as:',
            items: [
                'Moves that use a Social Attribute on their Accuracy Roll.',
                'Moves with the Added Effect "Never Miss".',
                'Moves that Target the Battlefield.'
            ]
        },
        actionEconomyNote:
            'Evasion and Clash are not affected by the Multiple Action difficulty chart (they can be your 1st or 5th action). However, they consume one Action even if unsuccessful.',
        note: 'Universal defense maneuver available to both Pokémon and Humans.',
        additionalNotes: [
            'Universal defense maneuver available to both Pokémon and Humans.',
            'There are Moves and Abilities that allow you to Evade more than once per Round.',
            'There are also Moves and Abilities able to temporarily prevent you from evading.'
        ]
    },
    {
        id: 'maneuver-grapple',
        name: 'Grapple',
        type: 'None',
        category: 'Support',
        power: '—',
        accuracy: 'Strength + Athletic/Brawl',
        damagePool: '—',
        target: 'Single Target (Blocks)',
        addedEffect:
            'Blocks the target. The Target may resist this Maneuver by rolling Strength or Dexterity score and scoring the same or more successes than the User. The User can’t Act while Grappling. The User can release the Grapple at any point to act.',
        flavor: 'Force the target into a wrestling lock; use a lasso rodeo-style; or simply cling onto one of their legs — the point is: you won’t let them escape!'
    },
    {
        id: 'maneuver-help-another',
        name: 'Help Another',
        type: 'None',
        category: 'Support',
        power: '—',
        accuracy: 'Same as Ally’s Attempted Action',
        damagePool: '—',
        target: 'Target One Ally',
        reaction: 'Reaction 1 (↑1)',
        reactionSpeed: 1,
        addedEffect:
            'Roll your Accuracy as if it were Chance dice. Add 1 die to the Accuracy Roll of your Ally for every 6 rolled. Up to 3 Characters may attempt to help a single action. Up to 6 Dice may be added this way.',
        flavor: 'Not being the best suited for a task doesn’t mean you won’t do your part in helping out. The best teams work together!'
    },
    {
        id: 'maneuver-run-away',
        name: 'Run Away',
        type: 'None',
        category: 'Support',
        power: '—',
        accuracy: 'Dexterity + Athletic',
        damagePool: '—',
        target: 'Target Self',
        addedEffect:
            'The User runs away from the battlefield to end the battle. Foes might try to prevent this by rolling: Dexterity + Athletic and scoring the same or more successes. If the user is Blocked this Maneuver fails.',
        flavor: 'Nope. Nope. Nope.'
    },
    {
        id: 'maneuver-stabilize-an-ally',
        name: 'Stabilize an Ally',
        type: 'None',
        category: 'Support',
        power: '—',
        accuracy: 'Clever + Medicine',
        damagePool: '—',
        target: 'Single Target',
        addedEffect:
            'The User applies CPR and/or first aid to an Ally. Target won’t receive Lethal Damage each hour anymore. Each Lethal Damage on the Ally reduces 1 Success to the Accuracy Pool of this Maneuver. This Maneuver can only be used once per hour.',
        flavor: 'Apply pressure! Give chest compressions! Suck out the venom! You are not losing anyone today!'
    },
    {
        id: 'maneuver-struggle',
        name: 'Struggle',
        type: 'None',
        category: 'Physical/Special',
        power: 'Strength / Special',
        accuracy: 'Dexterity + Brawl / Channel / Throw',
        damagePool: 'Strength/Special + 0',
        target: 'Single Target',
        addedEffect:
            'Universal unarmed/fallback strike. Inflicts Typeless Damage. Because Struggle is a Maneuver (not a Move), it CANNOT clash nor be clashed!',
        flavor: 'Scuffle about and make every effort to deliver a blow.',
        note: 'Default physical attack for unarmed humans and Pokémon that cannot use Moves. Cannot be used to Clash!'
    }
];

export function formatManeuverBroadcast(m: ManeuverData): string {
    const lines = [
        `**Maneuver: ${m.name}** [Type: ${m.type} | Category: ${m.category}]`,
        `• **Accuracy**: ${m.accuracy}`,
        `• **Power**: ${m.power} | **Damage Pool**: ${m.damagePool}`,
        `• **Target**: ${m.target}${m.reaction ? ` | **Reaction**: ${m.reaction}` : ''}`,
        `• **Effect**: ${m.addedEffect}`
    ];
    if (m.description) {
        lines.push(`• **Description**: ${m.description}`);
    }
    if (m.ifSuccessful && m.ifSuccessful.length > 0) {
        lines.push(`• **If Successful**:`);
        m.ifSuccessful.forEach((s) => lines.push(`  - ${s}`));
    }
    if (m.cannotBeUsedAgainst && m.cannotBeUsedAgainst.items.length > 0) {
        lines.push(`• **${m.cannotBeUsedAgainst.title}**:`);
        m.cannotBeUsedAgainst.items.forEach((item) => lines.push(`  - ${item}`));
    }
    if (m.actionEconomyNote) {
        lines.push(`⚡ **Action Economy**: ${m.actionEconomyNote}`);
    }
    if (m.example) {
        lines.push(`📖 **Example**: *${m.example.scenario}* (${m.example.roll})`);
    }
    if (m.note) {
        lines.push(`⚠️ *${m.note}*`);
    }
    if (m.additionalNotes && m.additionalNotes.length > 0) {
        m.additionalNotes.forEach((n) => lines.push(`ℹ️ *${n}*`));
    }
    lines.push(`*"${m.flavor}"*`);
    return lines.join('\n');
}
