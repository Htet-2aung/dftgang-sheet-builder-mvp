export const appConfig = {
  demoMode: true,
  upload: {
    maxFileSizeMb: 25,
    acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"] as const,
    acceptedExtensions: ".png,.jpg,.jpeg,.webp",
    /** Uploaded images are downscaled to this longest edge for on-screen editing + local persistence. */
    maxWorkingEdgePx: 2000,
    /** Assumed DPI when choosing a first-placement size. */
    defaultPlacementDpi: 150,
  },
  editor: {
    /** Margin shown around the sheet so out-of-bounds artwork stays visible. */
    sheetMarginInches: 1.5,
    minArtworkInches: 0.25,
    arrangeGapInches: 0.25,
    minZoom: 4,
    maxZoom: 80,
    historyLimit: 60,
  },
  units: "in" as const,
};
