export function canViewHomebrew(role: string, accessLevel: string): boolean {
    return role === 'GM' || accessLevel !== 'None';
}

export function isItemHiddenFromPlayer(isGmOnly: boolean | undefined, role: string): boolean {
    if (role === 'GM') return false;
    return isGmOnly === true;
}

export function getBaseShareUrl(): string {
    const origin = window.location.origin;
    let pathname = window.location.pathname;
    // Strip specific html file endings if present (e.g. index.html or initiative-tracker.html)
    pathname = pathname.replace(/\/[^/]+\.html$/, '/');
    if (!pathname.endsWith('/')) {
        pathname += '/';
    }
    return `${origin}${pathname}`;
}
