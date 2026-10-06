import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    Users,
    Map,
    Scroll,
    Search,
    Swords,
    Shield,
    ImageIcon,
    Palette,
    Dices,
    Crown,
    Link2,
    Accessibility,
    Smartphone,
    BookOpen,
    Zap,
    Layers,
    Sliders,
    Lock,
    UserCheck,
    Tag,
    Package,
    Bookmark,
    Sparkles,
    MousePointerClick,
    HardDrive
} from 'lucide-react';

export const CURRENT_VERSION = '3.7.0';

export interface ChangelogHighlight {
    id: string;
    version: string;
    title: string;
    icon: LucideIcon;
    badge?: string;
    summary: string;
    details: ReactNode;
}

export interface ChangelogEntry {
    version: string;
    date: string;
    highlights?: ChangelogHighlight[];
    changes: ReactNode[];
}

export interface ChangelogDiffResult {
    unseenVersions: string[];
    highlights: ChangelogHighlight[];
    isCatchUp: boolean;
    catchUpFromVersion: string | null;
}

export function getChangelogDiff(lastSeenVersion: string | null): ChangelogDiffResult {
    const allVersions = CHANGELOG_DATA.map((entry) => entry.version);
    const latestVersion = CHANGELOG_DATA[0]?.version || CURRENT_VERSION;

    // Helper to extract top N highlights across all entries, prioritizing unseen
    const allRecentHighlights = CHANGELOG_DATA.flatMap((e) => e.highlights || []);
    const getTopHighlights = (priorityList: ChangelogHighlight[], limit = 6): ChangelogHighlight[] => {
        const result: ChangelogHighlight[] = [];
        const seenIds = new Set<string>();

        for (const item of priorityList) {
            if (!seenIds.has(item.id)) {
                result.push(item);
                seenIds.add(item.id);
            }
            if (result.length >= limit) return result;
        }

        for (const item of allRecentHighlights) {
            if (!seenIds.has(item.id)) {
                result.push(item);
                seenIds.add(item.id);
            }
            if (result.length >= limit) break;
        }

        return result;
    };

    // First time user or no stored version
    if (!lastSeenVersion) {
        return {
            unseenVersions: [latestVersion],
            highlights: getTopHighlights(CHANGELOG_DATA[0]?.highlights || []),
            isCatchUp: false,
            catchUpFromVersion: null
        };
    }

    // User is fully up to date
    if (lastSeenVersion === latestVersion) {
        return {
            unseenVersions: [],
            highlights: getTopHighlights(CHANGELOG_DATA[0]?.highlights || []),
            isCatchUp: false,
            catchUpFromVersion: null
        };
    }

    const seenIndex = allVersions.indexOf(lastSeenVersion);

    if (seenIndex > 0) {
        // Versions between 0 and seenIndex are unseen
        const unseenEntries = CHANGELOG_DATA.slice(0, seenIndex);
        const unseenVersions = unseenEntries.map((e) => e.version);
        const unseenHighlights = unseenEntries.flatMap((e) => e.highlights || []);

        return {
            unseenVersions,
            highlights: getTopHighlights(unseenHighlights),
            isCatchUp: unseenVersions.length > 1,
            catchUpFromVersion: lastSeenVersion
        };
    }

    // If unseen index not found (e.g. older historical version not in list)
    return {
        unseenVersions: [latestVersion],
        highlights: getTopHighlights(CHANGELOG_DATA[0]?.highlights || []),
        isCatchUp: true,
        catchUpFromVersion: lastSeenVersion
    };
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
    {
        version: '3.7.0',
        date: 'October 2026',
        highlights: [
            {
                id: 'pokemon-pc-storage',
                version: '3.7.0',
                title: 'Pokémon PC Storage & Adventure Vaults',
                icon: HardDrive,
                badge: 'Major System',
                summary:
                    'Complete persistent Pokémon PC Storage: manage multiple trainers, campaigns, and themed boxes, inspect sheets directly, send out and recall tokens, and preserve attachments across scenes.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Persistent Pokémon Boxes & Party Management:</strong> Store, deposit, and withdraw
                            Pokémon between your active belt party and custom PC storage boxes with intuitive slot clicks
                            or drag-and-drop. Each box supports up to 30 Pokémon with individual name editing and custom
                            color themes.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Campaigns as Adventure Folders:</strong> Treat campaigns like folders to maintain
                            separate trainer profiles, team parties, and PC boxes for different games or storylines.
                            Switch between trainers with one click, run trainerless Pokémon Mystery Dungeon (PMD) teams,
                            and designate private folders for GM encounter prep.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Send Out, Recall & Persistent Attachments:</strong> Summon stored Pokémon onto the
                            map with either <em>Auto-Place</em> (spawns in front of your trainer) or <em>Click to Place</em> (choose
                            an exact map location). 1-click recall brings tokens right back into storage. Held items, hats,
                            and accessories attached to Pokémon tokens are remembered and restored across scenes!
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Direct Sheet Viewer & Portable Backups:</strong> View and edit full Pokémon and
                            Trainer character sheets directly within the PC storage interface. Save scene backups to
                            your Owlbear room or export and import portable JSON backup files with flexible duplication
                            and ownership transfer modes.
                        </p>
                        <div
                            style={{
                                marginTop: '12px',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                color: 'var(--text-main)',
                                fontSize: '0.88em',
                                lineHeight: 1.45
                            }}
                        >
                            <strong style={{ color: '#fbbf24' }}>Important Safety Reminder:</strong> PC Storage is a
                            major new system overhaul. While it has undergone aggressive testing, edge-case bugs may still
                            exist. Before delving deep into testing or reorganizing your storage, please use the{' '}
                            <strong>Backup</strong> button to export your important Pokémon to portable JSON backup
                            files!
                        </div>
                    </div>
                )
            },
            {
                id: 'welcome-overview',
                version: '3.7.0',
                title: 'Welcome Overview & Sheet Controls',
                icon: MousePointerClick,
                badge: 'Overview & Tools',
                summary:
                    'Brand new landing screen when no character is selected with quick-launch tools, 1-click sheet deselect controls, and customizable unselected theme colors.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>New Welcome Overview:</strong> When opening the extension without a token or
                            character selected, a clean landing screen greets you with quick-launch cards for Pokémon PC
                            Storage, Generators, the Battle Organizer, and Homebrew Workshop.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>1-Click Return to Menu / Deselect:</strong> Added a dedicated deselect button to both
                            the character header and top toolbar, allowing you to easily close a character sheet and
                            return to the main overview without losing your place during combat.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Custom Base Overview Theme:</strong> Personalize your own preferred theme colors for
                            the overview screen when no token is active. Your active Pokémon will still display their own
                            vibrant typing colors (such as Fire orange or Water blue) unless you choose to override them
                            globally.
                        </p>
                    </div>
                )
            }
        ],
        changes: [
            <strong
                key="pc-storage-title"
                className="text-title-primary"
                style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
                <HardDrive size={16} /> Pokémon PC Storage & Adventure Vaults
            </strong>,
            <ul
                key="pc-storage-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Persistent Pokémon Boxes:</strong> Deposit, withdraw, and organize Pokémon between your active
                    party and PC storage boxes. Each box holds up to 30 Pokémon and features custom names and color themes.
                </li>
                <li>
                    <strong>Campaigns as Adventure Folders:</strong> Organize separate storylines and games. Maintain distinct
                    trainer rosters, team parties, and PC boxes per campaign, or run in Trainerless PMD team mode.
                </li>
                <li>
                    <strong>Campaign Privacy & Active Room Adventures:</strong> Organize your PC with Public and Private
                    folders. GMs can designate an Active Room Campaign (marked with a green globe) so joining players
                    automatically connect to the right adventure.
                </li>
                <li>
                    <strong>Send Out with Auto-Place & Click to Place:</strong> Summon Pokémon directly from your party or
                    boxes to the battle map. Choose <em>Auto-Place</em> to drop in front of your trainer token or <em>Click to
                    Place</em> to target exact map coordinates.
                </li>
                <li>
                    <strong>1-Click Token Recall:</strong> Return active map tokens back into your party or PC storage with a
                    single click.
                </li>
                <li>
                    <strong>Persistent Token Attachments:</strong> Held items, hats, and accessories attached to your Pokémon
                    tokens are remembered and preserved when recalling to the PC or deploying onto brand-new scenes.
                </li>
                <li>
                    <strong>Full Sheet Viewer & Quick Navigation:</strong> Inspect and edit full Pokémon and Trainer character
                    sheets directly inside the PC modal without needing to spawn them onto the map first.
                </li>
                <li>
                    <strong>Cloud Scene Backups & Portable JSON Restore:</strong> Back up stored Pokémon to Owlbear scene
                    storage or export portable JSON files. Flexible import options allow duplicating as fresh Pokémon copies,
                    auto-merging with matching trainers, or transferring ownership between characters.
                </li>
                <li>
                    <strong>Pre-Testing Backup Recommended:</strong> Because PC Storage is a major new system overhaul,
                    please back up your important Pokémon to a JSON file using the <strong>Backup</strong> tool before
                    diving in to test the new storage features.
                </li>
                <li>
                    <strong>Trainer Organization & Reordering:</strong> Game Masters can now reorder trainers in their campaign list via a dedicated organization modal (with top, up, down, and bottom controls) to keep player rosters tidy and easily accessible.
                </li>
                <li>
                    <strong>Player Privacy & Storage Isolation:</strong> Non-GM players now only see their own trainers and their personal team storage in the PC, keeping the GM's encounter prep and other players' private rosters secluded.
                </li>
                <li>
                    <strong>Trainer Map Deployment Rank Fix:</strong> Deploying a trainer to the battle map now properly preserves their allocated rank, rank limit, and available skill points.
                </li>
                <li>
                    <strong>Nickname Synchronization & Fallback:</strong> Editing or clearing a Pokémon's nickname in the PC sheet now updates the storage display and party slots immediately. Deleting a nickname keeps the input field blank on the sheet while cleanly falling back to the species name across all displays.
                </li>
                <li>
                    <strong>Attachment Detachment & Backup Sync:</strong> Detaching an accessory or held item from a token on the map now unlinks it from the token's persistent memory, preventing duplicate attachments upon recall or re-deployment. Backup scenes now include all attached accessories, and entering a scene with older tokens updates their stats and attachments to match the latest sheet data.
                </li>
            </ul>,
            <strong
                key="battle-organizer-title"
                className="text-title-primary"
                style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
                <Swords size={16} /> Battle Organizer Enhancements
            </strong>,
            <ul
                key="battle-organizer-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Add New from Initiative (Mid-Round Swaps):</strong> Added a dedicated &quot;Add New from Initiative&quot;
                    button to pull newly swapped Pokémon or late arrivals directly into the current combat round without wiping
                    out or resetting existing combatants.
                </li>
                <li>
                    <strong>Flexible Tracker Reset Confirmation:</strong> Choose whether to reset action and clash/evade
                    counters for newly pulled combatants or preserve their existing tracker state.
                </li>
            </ul>,
            <strong
                key="empty-state-title"
                className="text-title-primary"
                style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
                <MousePointerClick size={16} /> Token Overview & Deselect Controls
            </strong>,
            <ul
                key="empty-state-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>New Welcome Overview:</strong> When opening the extension without a token selected, a clean
                    landing screen now greets you with quick-launch cards for Pokémon PC Storage, Generators, the Battle
                    Organizer, and Homebrew Workshop.
                </li>
                <li>
                    <strong>1-Click Deselect Button:</strong> Added a dedicated &quot;Deselect&quot; button to the character
                    header and top toolbar, allowing you to easily close a character sheet and return to the overview without
                    losing your place during combat.
                </li>
                <li>
                    <strong>Custom Base Overview Theme:</strong> Set your own preferred theme colors for the extension
                    overview when no token is selected. Active Pokémon will still display their own typing colors (e.g. Fire
                    orange, Water blue) unless you choose to override them globally.
                </li>
            </ul>,
            <strong
                key="generator-privacy-title"
                className="text-title-primary"
                style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
                <Lock size={16} /> Generator Privacy Defaults
            </strong>,
            <ul
                key="generator-privacy-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Private Token Defaults (GM Only):</strong> Added a 1-click privacy toggle to both the Pokémon
                    and Trainer Generators. When enabled, generated characters and teams can automatically roll as NPC-locked
                    tokens with GM-private dice rolls and GM-only health and will trackers.
                </li>
            </ul>,
            <strong
                key="dice-engine-title"
                className="text-title-primary"
                style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
                <Dices size={16} /> Dice+ Retired & Custom Action Rolls Unified
            </strong>,
            <ul
                key="dice-engine-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Dice+ Deprecation Complete:</strong> Support for the legacy Dice+ extension has been
                    fully retired and removed from the dice engine. All sheet and combat rolls now route exclusively
                    through <strong>Custom Action Rolls (CAR)</strong>.
                </li>
                <li>
                    <strong>Install Custom Action Rolls:</strong> If your Owlbear room does not have Custom Action Rolls
                    installed yet, you can copy the manifest link from the Room Rules menu or install it using:{' '}
                    <code style={{ wordBreak: 'break-all', color: 'var(--primary)' }}>
                        https://custom-action-rolls.narcolepticdracu.com/manifest.json
                    </code>
                </li>
                <li>
                    <strong>New Pure Roll Log (Performance Mode):</strong> Added a lightweight fallback roll mode in the
                    Room Rules menu. When selected, calculations resolve instantly and output directly to the in-app roll
                    log without rendering 3D dice—ideal for low-spec devices, tablets, or rooms without external dice
                    plugins installed.
                </li>
                <li>
                    <strong>Automatic Room Migration:</strong> Rooms and character profiles previously set to Dice+ are
                    automatically transitioned to Custom Action Rolls with in-app notice and zero gameplay disruption.
                </li>
            </ul>
        ]
    },
    {
        version: '3.6.6',
        date: 'September 2026',
        highlights: [
            {
                id: 'passives-and-smart-tags',
                version: '3.6.6',
                title: 'Passives System & Smart Item Tags',
                icon: Sparkles,
                badge: 'Sheet & Tags',
                summary: 'New Passives table for permanent boosts, interactive tag pills on items with active glow feedback, and cleaner roll log factors.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Dedicated Passives Table:</strong> Easily track permanent character enhancements (such as Rare Candy attribute bonuses, campaign boons, and innate perks) right below the Bag and above Notes without cluttering your inventory.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Smart Item Tags & Clean Descriptions:</strong> No more bracket tags cluttering your item notes! Official item effects are automatically converted into interactive tag pills. In list view, your rows stay neat and slim; simply scroll down inside an item&apos;s description box to view its tag pill at the bottom.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Equipped Status Feedback:</strong> Item tags glow with full vibrant color when equipped and dim when unequipped, so you always know at a glance when an item&apos;s bonus is applying to your rolls.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Cleaner Roll Logs with Factors Breakdown:</strong> Roll messages now display clean, easy-to-read math. Whenever abilities, items, or passives modify a roll, tap the new <strong>Factors</strong> button inside the roll log to inspect a complete breakdown of what contributed! Every factor (stat stage buffs, extra dice, and condition penalties like Confusion or Pain Penalties) is separated into its own card so you know exactly where every modifier comes from.
                        </p>
                    </div>
                )
            },
            {
                id: 'bag-grid-and-move-wishlist',
                version: '3.6.6',
                title: 'Bag Overhaul & Move Wishlist',
                icon: Package,
                badge: 'Bag & Moves',
                summary: 'Visual Card Grid view with S/M/L scaling, custom item artwork, and Learnset Move Wishlists.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Visual Bag & Card Grid View:</strong> Toggle your Bag between the classic compact table and a dynamic Card Grid view with customizable card scaling (Small, Medium, Large density), plus quick hover deletion with safety double-confirmation.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Automatic Item Artwork Sync:</strong> Whenever an item&apos;s artwork is set using an Owlbear Rodeo asset or web link, that image is automatically memorized and synced across all characters and teammates in the room! If anyone adds the same item, it automatically adopts the artwork. You can also pre-assign artwork to custom items directly in the Homebrew Workshop so they sync to all players seamlessly. (Note: local uploads from your device stay private to your own device, while OBR Library images and web URLs sync to everyone).
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Learnset Move Wishlist:</strong> Bookmark desired or future moves directly in your Pokémon&apos;s Learnset modal with a 1-click star/wishlist toggle, or add custom wishlist moves to plan your build progression ahead of time.
                        </p>
                    </div>
                )
            }
        ],
        changes: [
            <strong key="passives-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> Passives System & Smart Tags
            </strong>,
            <ul
                key="passives-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>New Passives Table:</strong> Added a dedicated table below the Bag and above Notes to track Rare Candy stat bonuses, campaign rewards, and passive traits with active checkmark toggles and standard deletion controls.
                </li>
                <li>
                    <strong>Interactive Tag Pills:</strong> Special effects on items, passives, and moves are now visual pills rather than raw bracket text in your notes. Click any pill to adjust its numbers or tap ✕ to remove it.
                </li>
                <li>
                    <strong>Collapsible Tag Pills:</strong> Multiple tags on passives or items neatly collapse into a compact preview that expands with a click, keeping tables clean and legible.
                </li>
                <li>
                    <strong>Tag Builder Search:</strong> Added a real-time search bar to the Tag Builder modal, making it quick and easy to find any tag by name, effect, or keyword without clicking through every category tab.
                </li>
                <li>
                    <strong>Slim Scrollable Item Notes:</strong> Bag list rows remain compact; scroll down inside an item&apos;s description box to view its tag pill at the bottom.
                </li>
                <li>
                    <strong>Equipped Status Feedback:</strong> Item tags glow when an item is equipped and dim when unequipped, making it clear when bonuses are active.
                </li>
                <li>
                    <strong>Detailed Roll Factors Pop-up:</strong> Roll messages are cleaner, with a new Factors button to inspect every ability, item, and passive bonus that modified the roll. Each factor displays on its own card showing its exact contribution (such as extra dice or stat stages), with condition penalties clearly separated.
                </li>
                <li>
                    <strong>Move Keywords:</strong> Standard move mechanics like High Critical, Never Miss, and Recoil appear as interactive pills inside Move edit.
                </li>
                <li>
                    <strong>Round Tracker Boost Controls:</strong> When abilities, items, or passives grant stacking boosts, a dedicated stepper control appears in the Round Tracker for easy tier tracking.
                </li>
                <li>
                    <strong>In-App Bug Reporting:</strong> Having issues or notice unexpected behavior with a feature? Use the new <strong>Report Bug</strong> button in the top toolbar to send a report and diagnostic details directly to Congra.
                </li>
            </ul>,
            <strong key="bag-grid-view-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Package size={16} /> Inventory & Bag Overhaul
            </strong>,
            <ul
                key="bag-grid-view-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Card Grid View:</strong> Added a toggle between the classic list/table view and an interactive Card Grid view with custom artwork previews, item badges, and quantity overlays.
                </li>
                <li>
                    <strong>Card Scaling Options:</strong> Choose between Small, Medium, and Large grid card density scaling presets to tailor item display to your screen size and preference.
                </li>
                <li>
                    <strong>Custom Item Artwork:</strong> Upload local images directly to IndexedDB, pick cloud assets straight from your Owlbear Rodeo image library, or link external URLs, complete with teammate visibility indicators.
                </li>
                <li>
                    <strong>Automatic Table-Wide Artwork Sync:</strong> Item images set via Owlbear Rodeo assets or web links automatically sync across all sheets and connected players. When an item name is added or typed on any sheet, it instantly adopts the known artwork without needing to re-upload.
                </li>
                <li>
                    <strong>Homebrew Item Artwork:</strong> Pre-assign custom artwork to homebrew items in the Homebrew Workshop so all players in the campaign automatically receive the icon when using or adding the item.
                </li>
                <li>
                    <strong>Hover Deletion Safeguards:</strong> Added quick hover delete buttons with confirmation safeguards directly on item cards.
                </li>
                <li>
                    <strong>Mobile & Layout Refinements:</strong> Polished mobile inventory action buttons, centered headers, and refined tooltips and modal spacing.
                </li>
            </ul>,
            <strong key="learnset-wishlist-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Bookmark size={16} /> Learnset Wishlist & Type Theming
            </strong>,
            <ul
                key="learnset-wishlist-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>1-Click Move Wishlist:</strong> Star any move directly from the species Learnset table to bookmark it for future rank-ups and leveling.
                </li>
                <li>
                    <strong>Custom Wishlist Moves:</strong> Add custom or homebrew wishlist moves with custom rank assignments, target categories, and notes.
                </li>
                <li>
                    <strong>Dedicated Wishlist Tab & Quick Action:</strong> Quickly view and manage all bookmarked moves in the dedicated Wishlist section of the Learnset modal.
                </li>
                <li>
                    <strong>Move Type Theming:</strong> Added a toggle to the Learnset so move pills can theme after their type color. Additionally, you can set per-type color choices for the Learnset pills.
                </li>
            </ul>,
            <strong key="sheet-controls-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} /> Stats & Lock Protections
            </strong>,
            <ul
                key="sheet-controls-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Base HP & Base Will Stat Locks:</strong> Added lock toggles to the Base values of HP and Will. Keeps base stat allocations locked alongside Core and Social attributes while allowing current and maximum pools to remain freely modular.
                </li>
                <li>
                    <strong>GM Permission Enforcement:</strong> Toggling Base HP or Will locks respects the Room Rules attribute lock setting, showing non-GM players an alert notification if GM permission is required to unlock.
                </li>
            </ul>
        ]
    },
    {
        version: '3.6.5',
        date: 'September 2026',
        highlights: [
            {
                id: 'gm-screen-rules-maneuvers',
                version: '3.6.5',
                title: 'GM Screen: Rules & Maneuvers',
                icon: BookOpen,
                badge: 'GM Screen',
                summary: 'Move clarifications, attribute benchmarks, trainer combat rules, switching, and core maneuvers.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Move Clarifications & Benchmarks:</strong> Added official Corebook rule clarifications for nuanced moves (Encore, Fling item damage table, Nature/Secret Power environmental matrix, Natural Gift berry flavor typing, Snatch theft rules, Substitute Decoy protections, and Unown Hidden Power) alongside Strength (lifting capacity, 40–1500 lbs) and Dexterity (speed, 6–99 mph) narrative benchmark tables with Athletics scaling and pain penalty adjustments.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Trainer Action Economy & Positioning:</strong> Added comprehensive rules for Trainer Area vs. In the Fray positioning, initiative rolls (<code>1d6 + Dexterity + Alert</code>), command action counts, and the 5 Actions per Round limit.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Tactical Switching & Maneuvers:</strong> Documented mid-round switching disorientation lockouts and optimal round-end swaps. Clarified human combat limitations (humans can Evade, but cannot Clash). Added a dedicated Maneuvers deck with quick-reference cards and broadcast triggers for all core maneuvers.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Streamlined Categories:</strong> Reorganized GM Screen tabs into unified <strong>Status & Environment</strong> and <strong>Catching & Progression</strong> tabs for a cleaner, faster browsing experience.
                        </p>
                    </div>
                )
            },
            {
                id: 'upgraded-tag-builder',
                version: '3.6.5',
                title: 'Upgraded Tag Builder & Boosts',
                icon: Tag,
                badge: 'Tag Builder',
                summary: 'Redesigned Tag Builder with category tabs, quick presets, stacking boost scaling, and live previews.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Modernized Tag Builder Interface:</strong> Completely redesigned the Tag Builder with an intuitive layout featuring category tabs (Attributes, Skills, Combat, Matchups, Mechanics, Turn-Based, Status), quick-select presets (+1 Stat, Stacking Boost, Type Dmg, Immunity, Half-HP Boost, High Crit), and instant chip selection.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Stacking Boosts & Custom Max Tiers:</strong> Added full support for tiered <code>@ Stacking Boost</code> (stepper 1–3) and custom caps (e.g. <code>@ Stacking Boost: 5</code>) with accurate per-tier combat roller scaling (+1 damage per stack) and tracker synchronization.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Crit Stacking & Super Luck:</strong> Added dedicated support and live explanations for <code>[Stacking High Crit]</code> vs standard <code>[High Crit]</code>. Standard High Critical does not stack by default in Pokerole; Stacking High Crit enables stacking with moves/items (like Razor Claw) for Super Luck and homebrew rules.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Live Tag Preview & Standard Spinners:</strong> Added a real-time syntax preview card with plain-language mechanics explanations before appending tags, powered by standardized NumberSpinners with Shift+Click stepping.
                        </p>
                    </div>
                )
            }
        ],
        changes: [
            <strong key="gm-screen-additions-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={16} /> GM Screen: Move Clarifications, Attribute Benchmarks & Category Cleanup
            </strong>,
            <ul
                key="gm-screen-additions-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Move Clarifications:</strong> Added in-depth reference cards and chat broadcast options for nuanced moves and mechanics from the Corebook (Encore action sequences, Fling item damage dice, Nature/Secret Power environmental alignments, Natural Gift berry flavor typing, Snatch theft rules, Substitute Decoy protections, and Unown Hidden Power).
                </li>
                <li>
                    <strong>Attribute Benchmarks:</strong> Added Strength (Lifting Capacity) and Dexterity (Top Speed) narrative benchmark charts with per-row broadcast triggers, Athletics scaling, and pain penalty reductions.
                </li>
                <li>
                    <strong>Category Consolidation:</strong> Reorganized GM Screen tabs into cleaner, balanced categories (merging Statuses, Weather, Hazards, and Types into <strong>Status & Environment</strong>; and merging Catching, Training, and Ranks into <strong>Catching & Progression</strong>).
                </li>
            </ul>,
            <strong key="trainer-maneuvers-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} /> Trainer Combat Rules, Switching Mechanics & Core Maneuvers
            </strong>,
            <ul
                key="trainer-maneuvers-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Trainer Action Economy & Positioning:</strong> Added reference tables and rules for Trainer Area vs. In the Fray actions (Commands, Switching, Items, Moving to Cover, Entering Fray, Running Away) under the 5 Actions per Round limit.
                </li>
                <li>
                    <strong>Tactical Switching & Mid-Round Lockout:</strong> Added official mechanics on switching (Area: 2 free switches then 1 action; Fray: Action on Trainer’s turn). Clarified why switching mid-round locks out actions until next round due to combat disorientation, making Round End the optimal time to swap or deploy fainted replacements.
                </li>
                <li>
                    <strong>Humans in Combat & Clashing:</strong> Clarified that humans can Evade incoming attacks, but CANNOT Clash (because Clashing requires a Move, and Struggle is officially a Maneuver). Included Pokémon bodyguarding mechanics and homebrew combat options.
                </li>
                <li>
                    <strong>Dedicated Maneuvers Category:</strong> Added a dedicated Maneuvers section to the GM Screen with individual reference cards and chat broadcast triggers for all core maneuvers (Struggle, Clash, Evade, Cover an Ally, Grapple, Ambush, Help Another, Run Away, Stabilize).
                </li>
            </ul>,
            <strong key="tag-builder-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={16} /> Tag Builder Modernization, Stacking Boosts & Crit Integration
            </strong>,
            <ul
                key="tag-builder-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Modernized Tag Builder:</strong> Overhauled the Tag Builder modal with category tabs, quick presets, and clean chip selectors across abilities, items, moves, custom forms, and statuses.
                </li>
                <li>
                    <strong>Stacking Boosts & Math Integration:</strong> Added full support for tiered <code>@ Stacking Boost</code> and custom <code>@ Stacking Boost: [N]</code> tags, fixing per-tier damage calculation scaling in the combat roller and tracker condition pill badges.
                </li>
                <li>
                    <strong>Stacking High Crit & Rule Clarity:</strong> Added <code>[Stacking High Crit]</code> tag support with in-builder rule documentation for Super Luck and homebrew crit stacking.
                </li>
                <li>
                    <strong>Live Preview & UI Spinners:</strong> Added real-time syntax and explanation previews, eliminated browser double-spinners using standard NumberSpinner components, and refactored the tag builder architecture into modular sub-components.
                </li>
            </ul>
        ]
    },
    {
        version: '3.6.4',
        date: 'September 2026',
        highlights: [
            {
                id: 'hud-offsets-calibration',
                version: '3.6.4',
                title: 'HUD Offsets & Calibration',
                icon: Sliders,
                badge: 'GM & Trackers',
                summary: 'Fine-tune token trackers room-wide with X/Y offsets & autoscale.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Tracker Recalibration Notice:</strong> Token trackers for HP, Will, etc. have been updated to auto-scale far more naturally across tokens of all shapes and sizes. If needed, click the <strong>Autoscale UI</strong> button or use offset spinners in Tracker Settings to quickly nudge existing tokens into alignment.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Global & Room X/Y Offset Controls:</strong> Added dedicated <strong>Global Offsets (X / Y)</strong> and <strong>Room Offset Override (X / Y)</strong> controls to the <strong>Room Rules & Permissions</strong> menu. GMs can now set baseline X and Y pixel shifts for all tokens across the entire room or override them per scene map, with quick -10/+10 stepping buttons and 1-click resets.
                        </p>
                    </div>
                )
            }
        ],
        changes: [
            <strong key="hud-refinement-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={16} /> Global & Room HUD Offsets & Tracker Calibration
            </strong>,
            <ul
                key="hud-refinement-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Tracker Recalibration Notice:</strong> A quick heads-up and apology - I changed up how the token trackers for HP, Will, etc auto-scale in this update, so you may need to retool or nudge your existing token trackers slightly (using the <strong>Autoscale UI</strong> button or offset spinners in Tracker Settings). Overall, HUDs should now scale and position themselves far more naturally and reliably across tokens of all shapes, sizes, and aspect ratios without awkward clipping or manual guesswork. It ain't perfect but it's better than it was for sure.
                </li>
                <li>
                    <strong>Global & Room X/Y Offset Controls:</strong> Added dedicated <strong>Global Offsets (X / Y)</strong> and <strong>Room Offset Override (X / Y)</strong> controls to the <strong>Room Rules & Permissions</strong> menu. GMs can now set baseline X and Y pixel shifts for all tokens across the entire room or override them per scene map, with quick -10/+10 stepping buttons and 1-click resets.
                </li>
            </ul>,
            <strong key="attribute-locking-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} /> Core & Social Attribute Locking
            </strong>,
            <ul
                key="attribute-locking-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Attribute Sheet Locking:</strong> Added interactive lock toggles to the headers of both the Core Attributes and Social Attributes tables. When locked (the default state), Base and Limit spinners are disabled to prevent players from accidentally incrementing base stats instead of allocating ranks with their stat points. Players can still freely allocate rank points while locked.
                </li>
                <li>
                    <strong>GM-Only Attribute Lock Rule:</strong> Added a new permission setting in <strong>Room Rules & Permissions</strong> (<strong>Attribute Locking</strong>, defaulting to GM-Only). When enabled, players cannot unlock their sheet's base attributes unless the GM unlocks it for them or sets the rule to Everyone.
                </li>
            </ul>
        ]
    },
    {
        version: '3.6.3',
        date: 'September 2026',
        highlights: [
            {
                id: 'trainer-team-generator',
                version: '3.6.3',
                title: 'Trainer & Team Generator',
                icon: Users,
                badge: 'NPC Generator',
                summary: 'Build battle-ready NPC trainers & teams with 50+ classes.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Complete Trainer & Team Generation:</strong> Instantly generate standalone NPC Trainers or complete battle-ready teams of 0–6 Pokémon with Pokerole-accurate ranks, attributes, skills, and suggested gym badges.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>50+ Curated Trainer Classes & Smart Tiers:</strong> Select or randomize from over 50 classes across 7 categories. Defaulted to <em>Min-Max (Competent)</em> to naturally bias stats, with support for tactical formation batch-spawning directly onto the Owlbear Rodeo map.
                        </p>
                    </div>
                )
            },
            {
                id: 'unified-lookup-tool',
                version: '3.6.3',
                title: 'Unified Lookup Tool',
                icon: Search,
                badge: 'Search & Moves',
                summary: 'Dual-tab search across 1,200+ Pokémon, moves & learnsets.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Dual-Tab Lookup Engine:</strong> What was originally the Pokémon Lookup tool has been expanded into the unified <strong>Lookup Tool</strong> with dual tabs to seamlessly search both Pokémon and Moves!
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Full Move Database Search:</strong> Search and filter every move by Typing, Damage Category (Physical, Special, Support), Targets, Power, Accuracy, Rank requirements, and mechanical effects.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Bidirectional Cross-Referencing:</strong> Click any move in a Pokémon's learnset to view its move card, or expand any move's reverse learnset to view all Pokémon that can learn it with 1-click links!
                        </p>
                    </div>
                )
            },
            {
                id: 'ability-automation',
                version: '3.6.3',
                title: 'Automated Ability Tags',
                icon: Zap,
                badge: 'Combat Engine',
                summary: 'Reactive rank scaling & automatic triggers for abilities.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Reactive Ability Automation:</strong> Integrated dozens of canonical abilities (Blaze, Overgrow, Torrent, Swarm, Huge Power, Pure Power, Hustle, Keen Eye, Super Luck, Sniper, Compound Eyes, Guts, Marvel Scale, Quick Feet, Poison Heal, Toxic Boost, Flare Boost, and more) into the sheet's reactive Tag engine without cumbersome hardcoding.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Dynamic Rank Scaling:</strong> Abilities with rank-dependent bonuses like Huge Power and Pure Power automatically scale their stat boosts based on current Rank (from Starter through Master).
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Move Category Modifiers & Triggers:</strong> Added move category damage tags like <code>[Dmg +X: Fist Move]</code>, critical calculation tags like <code>[Crit Dmg +X]</code>, and universal status triggers like <code>@ Burn</code> and <code>@ Poison</code>.
                        </p>
                    </div>
                )
            }
        ],
        changes: [
            <strong key="token-ui-autoscale-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} /> Token UI Scaling, Render Layers & HUD Controls
            </strong>,
            <ul
                key="token-ui-autoscale-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Updated Token UI Scaling:</strong> I've updated how tracker HUD elements and badges scale across different grid DPIs and token resolutions. Overall, this improves initial token scaling out of the box so you won't need to make manual size adjustments as often in the future.
                </li>
                <li>
                    <strong>Autoscale UI Button:</strong> If an existing token's HUD appears misaligned or needs recalibration after the update, open Tracker Settings and click the new <strong>Autoscale UI</strong> button (or <strong>Autoscale All</strong> for GMs) to instantly calibrate and fix token UI scaling and vertical offsets.
                </li>
                <li>
                    <strong>Custom HUD Render Layers:</strong> Added a new <strong>HUD Layer</strong> option in Tracker Settings! You can now choose whether a token's HUD renders above token attachments like weapons and hats (<em>Above Attachments / Popover</em>), on the standard attachment layer (<em>With Attachments</em>), on the character plane (<em>Character Layer</em>), or tucked underneath the sprite (<em>Behind Token / Mount</em>).
                </li>
                <li>
                    <strong>Room-Wide Default HUD Scale:</strong> GMs can now set a room-level baseline HUD scale in the <strong>Room Rules</strong> modal. This room setting automatically scales all token HUDs across the scene, while individual tokens can still adjust their relative scale in Tracker Settings.
                </li>
                <li>
                    <strong>Sync Offsets & Coordinates Tool:</strong> GMs can now sync token HUD coordinates, layer preferences, and fine-tune placements across all tokens on the map with a single click using the new <strong>Sync Offsets</strong> button in Tracker Settings (and <strong>Sync All</strong> in the Fine-Tune Placements modal).
                </li>
            </ul>,
            <strong key="ability-automation-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} /> Automated Ability Integration & Smart Tags
            </strong>,
            <ul
                key="ability-automation-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Reactive Ability Automation:</strong> Integrated dozens of canonical abilities (Blaze, Overgrow, Torrent, Swarm, Huge Power, Pure Power, Hustle, Keen Eye, Super Luck, Sniper, Compound Eyes, Guts, Marvel Scale, Quick Feet, Poison Heal, Toxic Boost, Flare Boost, and more) into the sheet's reactive Tag engine without cumbersome hardcoding.
                </li>
                <li>
                    <strong>Dynamic Rank Scaling:</strong> Abilities with rank-dependent bonuses like Huge Power and Pure Power automatically scale their stat boosts based on the Pokémon's current Rank (from Starter through Master).
                </li>
                <li>
                    <strong>Move Category Modifiers:</strong> Added system-wide support for move category damage tags including <code>[Dmg +X: Fist Move]</code>, <code>[Dmg +X: Pulse Move]</code>, <code>[Dmg +X: Sound Move]</code>, <code>[Dmg +X: Ballistics Move]</code>, <code>[Dmg +X: Blade Move]</code>, and <code>[Dmg +X: Contact]</code>.
                </li>
                <li>
                    <strong>Accuracy & Critical Tags:</strong> Added <code>[Crit Dmg +X]</code> for clean critical hit damage calculation (e.g. Sniper) without tampering with dice pools, as well as <code>[Acc +X: Low Accuracy]</code> and <code>[Low Acc +X: Physical/Special]</code> to properly aid moves with the mechanical Low Accuracy tag (e.g. Compound Eyes).
                </li>
                <li>
                    <strong>Comprehensive Status Triggers:</strong> Added the universal <code>@ Status</code> trigger tag and dedicated triggers for every condition (<code>@ Burn</code>, <code>@ Frozen Solid</code>, <code>@ Poison</code>, <code>@ Badly Poisoned</code>, <code>@ Paralysis</code>, <code>@ Asleep</code>, <code>@ Confusion</code>, <code>@ Blind</code>, <code>@ Infatuated</code>, etc.) for cross-system use on abilities, items, moves, and custom forms.
                </li>
                <li>
                    <strong>Conditional Round-End Healing:</strong> Added support for conditional round-end regeneration tags like <code>[Heal X Round End @ Condition]</code> (e.g. <code>[Heal 1 Round End @ Poison]</code> for Poison Heal).
                </li>
                <li>
                    <strong>Interactive Ability Boost Tracking:</strong> Added an inline Ability Boost toggle in the Round Tracker condition drawer and Ability Menu modal for manual and absorption abilities (Sap Sipper, Lightning Rod, Motor Drive, Storm Drain, Flash Fire, Well-Baked Body, Moxie, Beast Boost, Defiant, Competitive, Unburden) using the <code>@ Boost</code> tag.
                </li>
            </ul>,
            <strong key="trainer-generator-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} /> Trainer & Team Generator
            </strong>,
            <ul
                key="trainer-generator-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Complete Trainer & Team Generation:</strong> Instantly generate standalone NPC Trainers or complete battle-ready teams of 0–6 Pokémon with Pokerole-accurate ranks, attributes, skills, and suggested gym badges.
                </li>
                <li>
                    <strong>Streamlined Team Size Selector:</strong> Dedicated quick-toggle buttons for 0 through 6 Pokémon (<em>None</em>, <em>Solo</em>, <em>Duo</em>, <em>Trio</em>, <em>Squad</em>, <em>Team</em>, <em>Full</em>) replacing sliders for instant party configuration.
                </li>
                <li>
                    <strong>50+ Curated Trainer Classes:</strong> Select or randomize from over 50 thematic trainer concepts across 7 categories (Wild & Nature, Martial & Combat, Urban & Specialist, Scholar & Tech, Social & Show, Villains & Grunts, Elite & Universal) with tailored type preferences, Supernatural tags, and suggested stat archetypes.
                </li>
                <li>
                    <strong>Smart Pokémon Build Tiers:</strong> Defaulted to <em>Min-Max (Competent)</em>, which auto-detects each Pokémon species' natural attack bias (Physical vs Special) and defensive bias (Evasion vs Clash) to cap primary offensive and defensive stats first. Options also available for <em>Average (Balanced)</em> and <em>Wild (Untrained)</em>.
                </li>
                <li>
                    <strong>Granular Pokémon Rank Rules:</strong> Choose between matching the Trainer's rank, randomized ranks (with obedience cap), or <em>Specify Per Pokémon</em> with individual rank dropdowns for each team slot.
                </li>
                <li>
                    <strong>Unique Species by Default:</strong> Automatically guarantees no duplicate Pokémon on the team (e.g. preventing multiple Lapras on a Skier's roster), with an optional checkbox to allow duplicates.
                </li>
                <li>
                    <strong>OBR Token Spawning & Formations:</strong> Batch-spawns the Trainer and their party onto the Owlbear Rodeo map in an organized tactical formation, pre-calculating tracker graphics for HP and Will bars. In Standalone mode, creates the Trainer and nests their party members in the sidebar directory.
                </li>
                <li>
                    <strong>Artwork Picker & Map Auto-Detection:</strong> Supports selecting a default image from your OBR library, prompting for each token with species pre-filled in search, or auto-matching artwork from existing tokens on the active map.
                </li>
                <li>
                    <strong>Token Image Centering & Fallback Fixes:</strong> Fixed token pivot offsets when updating images from the OBR library so HUD graphics remain centered, and ensured fallback Pokéball icons resolve absolute URLs to eliminate broken image icons.
                </li>
            </ul>,
            <strong key="biome-ecosystems-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Map size={16} /> 25-Biome Ecosystems & Habitat Filtering
            </strong>,
            <ul
                key="biome-ecosystems-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Official 25-Biome Ecology System:</strong> Integrated 25 canonical Pokémon habitats—including Cities, Temperate Forests, Caves, Glaciers, Oceans, Deserts, Volcanoes, Swamps, Mountains, and more—mapping natural type affinities and encounter pools.
                </li>
                <li>
                    <strong>Location Filtering in Pokémon Generator:</strong> Filter single or batch Pokémon generation by any of the 25 biomes, constraining candidate species to their ecological type pools.
                </li>
                <li>
                    <strong>Trainer Origin Biomes & Thematic Classes:</strong> Select or roll an environmental origin in the Trainer Generator with quick-pick chips and a <em>"Random from Biome Match"</em> option to generate iconic local classes (e.g. Bug Catcher in a Forest, Hiker in a Cave, Diver in an Ocean).
                </li>
                <li>
                    <strong>Decoupled Team Habitats:</strong> Pokémon team ecosystems are decoupled from the trainer origin by default (allowing trainers to carry Pokémon from outside their native biome), with a <em>"Match Trainer Biome"</em> option available whenever you want a 100% local roster.
                </li>
                <li>
                    <strong>Concept-Type Protection:</strong> Specialist trainers (like Bug Catchers or Swimmers) always retain their signature typing even when encountered in atypical habitats.
                </li>
                <li>
                    <strong>Categorized Skills & Previews:</strong> Grouped Pokémon and Trainer skills under canonical categories (Fight, Survive, Social, Knowledge) in Title Case, with interactive preview modals to tinker stats, reroll individual members, and verify rosters before spawning.
                </li>
            </ul>,
            <strong key="learnset-modal-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={16} /> Interactive Move Learnsets & 1-Click Quick-Add
            </strong>,
            <ul
                key="learnset-modal-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Interactive Learnset Pills:</strong> All rank-grouped learnset pills nested under the character sheet's moves table are now interactive buttons. Clicking any move name opens a comprehensive Move Detail Modal with its typing, category, damage/accuracy formulas, power, target, active tags, mechanical rules, and flavor text.
                </li>
                <li>
                    <strong>1-Click Quick-Add (+) Buttons:</strong> Each unlearned move features a dedicated <code>+</code> button directly on the pill to instantly learn and equip the move into an empty or new move slot—bypassing the modal for rapid character building.
                </li>
                <li>
                    <strong>Smart Move Deduplication:</strong> The sheet automatically cross-checks your equipped moves in real time; moves already learned display an equipped checkmark (✓) and hide the quick-add button to prevent accidental duplicate slots.
                </li>
                <li>
                    <strong>In-Modal Discord Markdown & Table Broadcast:</strong> Move Detail Modals include 1-click buttons to copy clean Discord-formatted Markdown or broadcast move details directly to the Owlbear Rodeo tabletop or Standalone Roll Log.
                </li>
            </ul>,
            <strong key="room-rules-permissions-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Scroll size={16} /> Room Rules & GM Permissions
            </strong>,
            <ul
                key="room-rules-permissions-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Room Rules Hidden for Non-GMs:</strong> The Room Rules button on the global toolbar is now strictly restricted to GMs and hidden from players (was meant to always be that way, oops).
                </li>
                <li>
                    <strong>Generators Locked Behind Room Rules:</strong> The Pokémon and Trainer generators are now locked behind Room Rules permissions and defaulted to <strong>GM Only</strong>. GMs can choose to grant access to <strong>Everyone</strong> from the Room Rules menu whenever desired.
                </li>
                <li>
                    <strong>Clean Trainer Sheets:</strong> Removed the Pokémon autocomplete dropdown from the Trainer and Special Trainer "Concept" field to allow seamless freeform class entry.
                </li>
            </ul>,
            <strong key="lookup-tool-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Search size={16} /> Unified Lookup Tool: Moves & Cross-Referencing
            </strong>,
            <ul
                key="lookup-tool-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Renamed to "Lookup Tool":</strong> What was originally the Pokémon Lookup tool in the GM Screen has been expanded into the unified <strong>Lookup Tool</strong>, now featuring dual tabs to seamlessly search both Pokémon and Moves!
                </li>
                <li>
                    <strong>Full Move Database Search:</strong> Added a comprehensive Move Lookup tab allowing GMs and players to search and filter every move by Typing, Damage Category (Physical, Special, Support), Targets, Power, Accuracy, Rank requirements, and mechanical effects.
                </li>
                <li>
                    <strong>Interactive Click-Through Cross-Referencing:</strong> Integrated smooth bidirectional navigation between Pokémon and Moves. When viewing a Pokémon's learnset (e.g. Charizard), click on any move (like <em>Flamethrower</em>) to instantly jump straight into its complete move card details.
                </li>
                <li>
                    <strong>Move Learnset Reverse Lookup:</strong> While viewing any move in Move Lookup, expand the learnset section to see a full list of every Pokémon capable of learning it and at what ranks, with 1-click links to jump directly to that Pokémon's profile!
                </li>
            </ul>
        ]
    },
    {
        version: '3.5.0',
        date: 'September 2026',
        highlights: [
            {
                id: 'battle-organizer',
                version: '3.5.0',
                title: 'Battle Organizer & Encounters',
                icon: Swords,
                badge: 'Combat Engine',
                summary: 'Track rounds, battlefield conditions, sync token actions & print PDF.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Interactive Battlefield & Arena Conditions:</strong> Track stadium pitch layout, active weather conditions, terrain types, environmental hazards, and Player/Foe Force Fields (Reflect, Light Screen, Safeguard, Mist) with auto-decrementing duration boxes when advancing rounds.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Multi-Round Combat & Action Economy:</strong> Plan and organize battles round-by-round with multi-round duplicate and reorder tools. Track individual action slots per combatant with completion marks (✓), clash/fail indicators (✗), held items, and status conditions.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Full Round Reset & Live Action Sync:</strong> The Battle Organizer acts as a complete round reset engine! Pull combatants and initiatives straight from the Initiative Order. The <em>Push Actions to Sheet</em> and <em>Refresh Stats</em> buttons sync all action economy states directly to map tokens and character sheets in real time.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Live HP & Will Resource Display:</strong> Added compact HP and Will indicators for each combatant directly in the Organizer view so GMs and players can monitor vital resources at a glance during combat.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Owlbear Modal, Multi-Window & Print PDF:</strong> Open as a dedicated full-size modal in Owlbear Rodeo, pop out into an independent browser window for multi-monitor setups, or export comprehensive print-ready PDF battle sheets with stadium graphics and stat lines.
                        </p>
                    </div>
                )
            }
        ],
        changes: [
            <strong key="pokedex-lookup-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Search size={16} /> GM Screen: Pokédex Lookup Tool
            </strong>,
            <ul
                key="pokedex-lookup-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Multi-Factor Pokédex Search:</strong> A lightning-fast, offline-ready search tool built directly into the GM Screen to look up Pokémon across the entire 1,200+ database with zero network lag via a pre-compiled search index.
                </li>
                <li>
                    <strong>Comprehensive Filtering:</strong> Filter by Type and Dual-Typing (with "Either Type" vs "Exact Dual Match" modes), Ability name and slot (Standard 1/2 vs Hidden Ability), Move name and Learned Rank (Starter through Master), Good Starter status, and Legendary/Mythical status.
                </li>
                <li>
                    <strong>Rank-Categorized Move Learnsets:</strong> The expandable Details drawer breaks down the Pokémon's entire move learnset chronologically by Rank (Starter, Rookie, Standard, Advanced, Expert, Ace, Master) with search-matched moves clearly highlighted.
                </li>
                <li>
                    <strong>Homebrew Hidden Ability Tooltip:</strong> Standardized with the app's native TooltipIcon, clearly noting that Hidden Abilities are community homebrew additions and not official canon Pokerole rules (GM discretion advised).
                </li>
                <li>
                    <strong>Expanded Discord Quick-Reference:</strong> One-click "Discord" button formats a complete GM quick-reference sheet including Types, Abilities, Base Stats (HP, Str, Dex, Vit, Spe, Ins), and full rank-grouped move learnsets.
                </li>
                <li>
                    <strong>Homebrew Workshop Integration:</strong> Automatically includes custom Pokémon created in your Homebrew Workshop alongside canon Pokémon in all searches.
                </li>
            </ul>,
            <strong key="battle-organizer-sync-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Swords size={16} /> Battle Organizer: Full Round Reset & Action Sync
            </strong>,
            <ul
                key="battle-organizer-sync-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Full Round Reset & Live Action Sync:</strong> The Battle Organizer now acts as a complete round reset engine! Syncs all actions directly to map tokens in Owlbear Rodeo, or to each character sheet in Standalone mode.
                </li>
                <li>
                    <strong>Automatic Action & Hit/Miss Tracking:</strong> Automatically ticks off actions rolled within the Organizer itself by accessing the Pokémon's sheet, and allows users to mark hit or miss with automatic application to the Organizer.
                </li>
                <li>
                    <strong>"Push Actions to Sheet":</strong> Click the "Push Actions to Sheet" button to instantly sync all action economy states from the Organizer directly to applicable tokens and character sheets.
                </li>
                <li>
                    <strong>"Refresh Stats" Button:</strong> Easily resolve any stat desynchronization across combatants with a single click.
                </li>
                <li>
                    <strong>Live HP & Will Resource Display:</strong> Added compact HP and Will indicators for each combatant directly in the Organizer view so GMs and players can monitor vital resources at a glance during combat.
                </li>
            </ul>
        ]
    },
    {
        version: '3.4.0',
        date: 'September 2026',
        highlights: [
            {
                id: 'gm-screen-guide',
                version: '3.4.0',
                title: 'GM Screen & Reference',
                icon: Shield,
                badge: 'GM Tools',
                summary: 'Core rules, catching calculator, and reference tables.',
                details: (
                    <div>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Core Rules & Reference Tables:</strong> Includes all essential information from the corebook for quick reference—combat flow, difficulty, will points, trainer actions, cover, healing, status stacking, rank balance, and the interactive Catching Calculator.
                        </p>
                        <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            <strong>Homebrew & Expansion Mechanics:</strong> Includes reference guides for PMD (dungeon items, food, weapons, switchers) and Pokémon Rangers (Styler, styles, maneuvers, partner bonds).
                        </p>
                    </div>
                )
            }
        ],
        changes: [
            <strong key="battle-organizer-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Swords size={16} /> Battle Organizer Sheet & Encounter Manager
            </strong>,
            <ul
                key="battle-organizer-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Interactive Battlefield & Arena Conditions:</strong> Track stadium pitch layout, active weather conditions, terrain types, environmental hazards, and Player/Foe Force Fields (Reflect/Light Screen/Safeguard/Mist) with automatic 1–4 round duration boxes that decrement seamlessly when advancing rounds.
                </li>
                <li>
                    <strong>Multi-Round Combat Tracking:</strong> Organize combat round-by-round with multi-round planning. Add, duplicate, reorder, or delete rounds, and easily advance combat rounds with one click.
                </li>
                <li>
                    <strong>Combatant Action Management:</strong> Track individual action slots per combatant with completion marks (✓), clash/fail indicators (✗), active held items, and persistent status condition tags.
                </li>
                <li>
                    <strong>1-Click Initiative Sync:</strong> Pull combatants, nicknames, held items, statuses, and rolled initiatives straight from the Initiative Order into your active battle round.
                </li>
                <li>
                    <strong>Owlbear Rodeo Popout Modal & Standalone Multi-Window Support:</strong> Open the Battle Organizer as a dedicated full-size modal iframe in Owlbear Rodeo (up to 95% of viewport width) or pop it out into an independent browser window in Standalone mode for multi-monitor setups with live two-way synchronization.
                </li>
                <li>
                    <strong>Print-to-PDF Battle Sheet:</strong> Export comprehensive, print-ready battle sheets with full stadium graphics, combatant stat lines, and action tracking grids.
                </li>
            </ul>,
            <strong key="gm-screen-update-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> GM Screen & Reference Guide
            </strong>,
            <ul
                key="gm-screen-update-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Core Rules & Reference Tables:</strong> Includes all essential information from the corebook for quick reference—combat flow, difficulty, will points, trainer actions, cover, healing, status stacking, rank balance, and the interactive Catching Calculator.
                </li>
                <li>
                    <strong>Homebrew & Expansion Mechanics:</strong> Includes reference guides for PMD (dungeon items, food, weapons, switchers) and Pokémon Rangers (Styler, styles, maneuvers, partner bonds).
                </li>
                <li>
                    <strong>Community Requests & Feedback:</strong> Have suggestions or want specific reference rules added? Reach out to <strong>@congra</strong> on the Pokérole Discord!
                </li>
            </ul>,
            <strong key="avatar-delete-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} /> Artwork & Display Image Management
            </strong>,
            <ul
                key="avatar-delete-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Double-Confirmed Image Deletion:</strong> Easily remove character portrait artwork with a safe double-confirmation prompt, instantly clearing the image from browser storage and IndexedDB.
                </li>
                <li>
                    <strong>Interactive Portrait Click:</strong> Click directly on the character portrait on the sheet to manage or update character artwork.
                </li>
            </ul>
        ]
    },
    {
        version: '3.3.0',
        date: 'August 2026',
        changes: [
            <strong key="gm-screen-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> GM Screen & Rules Cheat Sheet Modal
            </strong>,
            <ul
                key="gm-screen-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Comprehensive In-App GM Screen:</strong> Added a dedicated GM Screen & Rules Cheat Sheet accessible directly from the Global Toolbar. Features instant real-time search across 16 core mechanic cards, category filters, and collapsible accordion sections.
                </li>
                <li>
                    <strong>1-Click Discord Markdown & Table Broadcasts:</strong> Every rule, table, status condition, and calculator features dedicated buttons to copy clean Discord-formatted Markdown to your clipboard or broadcast directly to the Owlbear Rodeo table / Standalone Roll History widget.
                </li>
                <li>
                    <strong>Deep Linking & Shareable URLs:</strong> Easily grab quick links to the GM Screen or specific sections (e.g. status conditions, weather, catching) to share quick-access rules with players in Discord.
                </li>
                <li>
                    <strong>Interactive Catching Calculator:</strong> Calculate catching probabilities in real time with Pokéball, Greatball, Ultraball, and customizable Seal Power fill-in dice support along with condition and rank multipliers.
                </li>
                <li>
                    <strong>Encounter Balancing Difficulty Matrix:</strong> Full 5-column challenge evaluation matrix with color-coded badges matching the official cheat sheet.
                </li>
                <li>
                    <strong>Special Thanks & Credit:</strong> Huge thanks and credit to Willowlark for putting together and compiling the reference information for this cheat sheet!
                </li>
            </ul>,
            <strong key="toolbar-theme-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={16} /> Global Toolbar Theme & UI Polish
            </strong>,
            <ul
                key="toolbar-theme-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Themed Toolbar Icons:</strong> The Theme, What's New, and Accessibility buttons now dynamically inherit the sheet's active primary theme color and hover tint.
                </li>
            </ul>
        ]
    },
    {
        version: '3.2.0',
        date: 'August 2026',
        changes: [
            <strong key="gen-token-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Dices size={16} /> Auto-Build Pokémon: Owlbear Rodeo Token Spawning
            </strong>,
            <ul
                key="gen-token-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Direct Token Creation on OBR:</strong> You can now spawn brand new Pokémon character tokens
                    directly onto the Owlbear Rodeo map from the Pokémon Generator! It prompts image selection directly
                    from your Owlbear asset library, places the token at the center of your screen, and selects it
                    immediately.
                </li>
                <li>
                    <strong>Destination Selector:</strong> Choose between "Generate New Token" and "Overwrite Selected
                    Token" (or "Generate New Sheet" in Standalone mode). Overwrite is safely disabled when no token is
                    selected.
                </li>
            </ul>,
            <strong key="master-champ-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Crown size={16} /> Master & Champion Rank Passive Automation
            </strong>,
            <ul
                key="master-champ-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>+3 Stat & Resource Bonuses:</strong> Master and Champion characters automatically receive +3
                    Max HP, +3 Max Will, +3 Base Initiative, +3 Defense, and +3 Special Defense across the sheet,
                    derived panels, and token badges.
                </li>
                <li>
                    <strong>+2 Dice on All Skill Rolls:</strong> Move Accuracy rolls, Action Rolls, Skill Checks,
                    Evasion, Clash, Maneuvers, and Skill-based Status Recoveries automatically gain +2 dice and are
                    tagged in the roll log.
                </li>
                <li>
                    <strong>Real-Time Move Accuracy Display:</strong> Move cards and table rows now dynamically display
                    your full Accuracy dice pool in real time.
                </li>
            </ul>,
            <div
                key="car-reminder-320"
                style={{
                    border: '2px solid var(--primary)',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                    marginBottom: '16px'
                }}
            >
                <strong className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Link2 size={16} /> Custom Action Rolls (CAR) Manifest Helper
                </strong>
                <p
                    className="text-subtext"
                    style={{
                        color: 'var(--text-main)',
                        marginTop: '6px',
                        marginBottom: '8px',
                        fontSize: '0.9em',
                        lineHeight: '1.4'
                    }}
                >
                    Added built-in detection to warn if an outdated/retired hosting link for Custom Action Rolls is
                    detected. The active manifest URL is also directly available in the Room Rules modal.
                </p>
                <p style={{ margin: 0, fontSize: '0.9em', fontWeight: 'bold', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <Link2 size={14} /> Current CAR Manifest Link:{' '}
                    <a
                        href="https://custom-action-rolls.narcolepticdracu.com/manifest.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-value-highlight"
                        style={{ wordBreak: 'break-all' }}
                    >
                        https://custom-action-rolls.narcolepticdracu.com/manifest.json
                    </a>
                </p>
            </div>
        ]
    },
    {
        version: '3.1.0',
        date: 'August 2026',
        changes: [
            <strong key="ui-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={16} /> Dynamic Theming UI Overhaul
            </strong>,
            <ul
                key="ui-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Dynamic Type Themes:</strong> The entire character sheet now dynamically styles its buttons,
                    highlights, and accents based on your Pokémon's primary typing! No more flat gray sheets—every
                    Pokémon feels unique.
                </li>
                <li>
                    <strong>Global Theme Overrides:</strong> Don't like your Pokémon's default type color? You can now
                    click the "Theme" button in the Global Toolbar to enforce a completely custom color scheme for your
                    sheet!
                </li>
                <li>
                    <strong>Project Demojification:</strong> Replaced the old, inconsistent raw emojis across the app
                    with clean, professionally-styled SVG icons (courtesy of Lucide React).
                </li>
                <li>
                    <strong>Standardized Typography:</strong> Completely rebuilt the CSS architecture under the hood to
                    use unified, accessible text scaling across the board.
                </li>
            </ul>,
            <strong key="a11y-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Accessibility size={16} /> Accessibility Settings
            </strong>,
            <ul
                key="a11y-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Theme Contrast:</strong> You can now dynamically adjust the visual contrast of the sheet's
                    colors (either globally or per-type) to fit your specific visual needs.
                </li>
                <li>
                    <strong>Dyslexic-Friendly Font:</strong> A new toggle allows you to swap the entire sheet to a
                    dyslexic-friendly font for drastically improved readability.
                </li>
                <li>
                    <strong>Adjustable Font Size:</strong> Need larger text? You can now scale the global font size up
                    or down directly from the Accessibility settings.
                </li>
            </ul>,
            <div
                key="pwa-update"
                style={{
                    border: '2px solid var(--primary)',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                    marginBottom: '16px'
                }}
            >
                <strong className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Smartphone size={16} /> Standalone App & Offline Mode (PWA)
                </strong>
                <p
                    className="text-subtext"
                    style={{
                        color: 'var(--text-main)',
                        marginTop: '6px',
                        marginBottom: '0',
                        fontSize: '0.9em',
                        lineHeight: '1.4'
                    }}
                >
                    The sheet is now fully accessible as a <strong>Progressive Web App (PWA)</strong> outside of Owlbear
                    Rodeo! You can visit the live site, install it directly to your phone or desktop home screen, and
                    use it entirely offline. Standalone mode features a brand new local directory sidebar to easily
                    organize all your characters and encounters into folders.
                </p>
            </div>,
            <strong key="combat-title" className="text-title-primary" style={{ fontSize: '1.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Swords size={16} /> Combat Engine & Targeting Upgrades
            </strong>,
            <ul
                key="combat-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    <strong>Damage Overrides:</strong> GMs (and permitted players) can now manually override damage
                    directly in the Targeting Modal! Select between Dice Pool (Vs Def), Dice Pool (Ignore Def), or True
                    Damage (Flat).
                </li>
                <li>
                    <strong>Advanced Matchups & Effectiveness:</strong> The Targeting Modal now features options for 4x,
                    2x, 0.5x, and 0.25x effectiveness! Damage modifications are automatically calculated into the chat
                    log and gracefully drop if the base attack rolls 0 successes.
                </li>
                <li>
                    <strong>Expanded Smart Tags:</strong> You can now attach explicit move keywords to your combat tags
                    to trigger conditionally! For example: <code>[Dmg +1: Projectile Move]</code> or{' '}
                    <code>[Acc +2: Sound Move]</code>.
                </li>
            </ul>,
            <ul
                key="init-bugfix-list"
                className="text-subtext"
                style={{
                    color: 'var(--text-main)',
                    paddingLeft: '20px',
                    marginTop: '6px',
                    marginBottom: '16px',
                    fontSize: '0.9em',
                    lineHeight: '1.5'
                }}
            >
                <li>
                    Fixed a race condition bug in the Initiative Tracker that caused the UI to glitch when rapidly skipping
                    turns.
                </li>
            </ul>
        ]
    }
];
