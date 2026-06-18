const MAX = 50;
const _undo: string[] = [];
const _redo: string[] = [];

export function pushSnapshot(snap: string): void {
  _undo.push(snap);
  if (_undo.length > MAX) _undo.shift();
  _redo.length = 0;
}

export function undoPop(): string | null { return _undo.length ? _undo.pop()! : null; }
export function redoPop(): string | null { return _redo.length ? _redo.pop()! : null; }
export function pushRedo(snap: string): void { _redo.push(snap); }
export function pushUndoOnly(snap: string): void {
  _undo.push(snap);
  if (_undo.length > MAX) _undo.shift();
}
export function canUndo(): boolean { return _undo.length > 0; }
export function canRedo(): boolean { return _redo.length > 0; }
export function clearHistory(): void { _undo.length = 0; _redo.length = 0; }
