export type WorkspacePanel = 'navigation' | 'content' | 'details';
export const WORKSPACE_PANELS: WorkspacePanel[] = ['navigation', 'content', 'details'];
export function adjacentPanel(panel: WorkspacePanel, delta: number): WorkspacePanel {
  return WORKSPACE_PANELS[Math.max(0, Math.min(2, WORKSPACE_PANELS.indexOf(panel) + delta))];
}
export function swipePanel(panel: WorkspacePanel, dx: number, dy: number, elapsed: number, paired = false): WorkspacePanel {
  return elapsed <= 900 && Math.abs(dx) >= 65 && Math.abs(dx) > Math.abs(dy) * 1.7
    ? paired ? (panel === 'content' ? 'navigation' : 'content') : adjacentPanel(panel, dx < 0 ? 1 : -1) : panel;
}
export function displayedRoute(inspected: string, selected: string): string { return inspected || selected; }
