import { useCallback, useReducer } from "react";
import { appConfig } from "@/config/app";
import type { GangSheetProject, SheetArtworkPlacement } from "@/types";

type Snapshot = Pick<GangSheetProject, "sheetWidthInches" | "sheetLengthInches" | "placements">;

export interface EditorState {
  project: GangSheetProject;
  editingCartItemId?: string;
  selectedIds: string[];
  past: Snapshot[];
  future: Snapshot[];
  dirty: boolean;
}

type Action =
  | { type: "load"; project: GangSheetProject; editingCartItemId?: string; dirty?: boolean }
  | { type: "select"; ids: string[] }
  | { type: "commit"; update: (s: Snapshot) => Partial<Snapshot>; select?: string[] }
  | { type: "rename"; name: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saved" };

const snap = (p: GangSheetProject): Snapshot => ({
  sheetWidthInches: p.sheetWidthInches,
  sheetLengthInches: p.sheetLengthInches,
  placements: p.placements,
});

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "load":
      return { project: action.project, editingCartItemId: action.editingCartItemId, selectedIds: [], past: [], future: [], dirty: !!action.dirty };
    case "select":
      if (state.selectedIds.length === action.ids.length && state.selectedIds.every((id, i) => id === action.ids[i])) return state;
      return { ...state, selectedIds: action.ids };
    case "commit": {
      const before = snap(state.project);
      const patch = action.update(before);
      const project = { ...state.project, ...patch, updatedAt: new Date().toISOString() };
      const ids = new Set(project.placements.map((p) => p.id));
      return {
        ...state,
        project,
        past: [...state.past, before].slice(-appConfig.editor.historyLimit),
        future: [],
        dirty: true,
        selectedIds: (action.select ?? state.selectedIds).filter((id) => ids.has(id)),
      };
    }
    case "rename":
      return { ...state, project: { ...state.project, name: action.name }, dirty: true };
    case "undo": {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return { ...state, project: { ...state.project, ...prev }, past: state.past.slice(0, -1), future: [snap(state.project), ...state.future], dirty: true, selectedIds: [] };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return { ...state, project: { ...state.project, ...next }, past: [...state.past, snap(state.project)], future: state.future.slice(1), dirty: true, selectedIds: [] };
    }
    case "saved":
      return { ...state, dirty: false };
  }
}

export function useGangSheet(initial: () => EditorState) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);

  const commit = useCallback((update: (s: Snapshot) => Partial<Snapshot>, select?: string[]) => dispatch({ type: "commit", update, select }), []);
  const updatePlacements = useCallback(
    (updates: (Partial<SheetArtworkPlacement> & { id: string })[]) =>
      commit((s) => ({ placements: s.placements.map((p) => ({ ...p, ...updates.find((u) => u.id === p.id) })) })),
    [commit],
  );

  return {
    state,
    dispatch,
    commit,
    updatePlacements,
    select: useCallback((ids: string[]) => dispatch({ type: "select", ids }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
  };
}

export function emptyProject(id: string, now: string, lengthInches: number, widthInches: number): GangSheetProject {
  return { id, name: "Untitled gang sheet", sheetWidthInches: widthInches, sheetLengthInches: lengthInches, placements: [], createdAt: now, updatedAt: now };
}
