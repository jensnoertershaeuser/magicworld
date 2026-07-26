// Shared, mutable world state. Modules read these flags in their update
// functions (e.g. `if (state.paused) return;`). The UI buttons flip them.
export const state = {
  paused: false,
  night: false,
  labels: true,
  follow: false,
  autoSpin: true,
};
