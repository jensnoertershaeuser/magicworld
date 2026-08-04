// Shared, mutable world state. Modules read these flags in their update
// functions (e.g. `if (state.paused) return;`). The UI buttons flip them.
export const state = {
  paused: false,
  night: false,
  labels: true,
  follow: false,
  autoSpin: true,
  sound: true,    // master switch: the melody AND the sound effects
  build: 'robot', // what Balthasar and Opa build in the Technik-Haus: 'robot' | 'sup'
  // Which figure is on the bench in the Holzwerkstatt. The workshop owns the
  // catalogue (Bär, Vogel, Fisch, Hase, Eule, Pilz) and moves this on by itself
  // whenever one is finished, so the menu button only ever has to read it.
  carve: 'Bär',
};
