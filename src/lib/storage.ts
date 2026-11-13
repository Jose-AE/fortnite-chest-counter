// localStorage that never throws: it can be empty, blocked (private window, site data off) or full.

// The saved value, or null when there is none or it cannot be read.
export const readJson = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
};

export const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage is full or blocked: this visit still works, it just is not remembered
  }
};
