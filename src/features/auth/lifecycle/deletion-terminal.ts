

let deletionTerminal = false;

export function isDeletionTerminal(): boolean {
return deletionTerminal;
}

export function markDeletionTerminal(): void {
deletionTerminal = true;
}

export function clearDeletionTerminal(): void {
deletionTerminal = false;
}

export function _isDeletionTerminalForTesting(): boolean {
return deletionTerminal;
}
