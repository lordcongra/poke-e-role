export function canViewHomebrew(role: string, accessLevel: string): boolean {
    return role === 'GM' || accessLevel !== 'None';
}

export function isItemHiddenFromPlayer(isGmOnly: boolean | undefined, role: string): boolean {
    if (role === 'GM') return false;
    return isGmOnly === true;
}
