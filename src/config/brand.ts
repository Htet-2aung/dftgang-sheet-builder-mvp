/** Central brand configuration — replace with the client's real details. */
export const brand = {
  name: "FilmForge",
  tagline: "Your designs. Precisely printed.",
  description:
    "Build custom DTF gang sheets online: upload artwork, size it precisely, arrange your layout and see an instant price estimate.",
  contact: {
    email: "hello@example.com",
    phone: "+44 (0)000 000 0000",
    address: "Business address — awaiting client approval",
    companyNumber: "Company no. — to be confirmed",
  },
  /** Canvas colours (fabric.js needs literal colour strings). */
  canvasTheme: {
    selection: "#4E7D50",
    selectionFill: "rgba(78, 125, 80, 0.10)",
    missingFill: "rgba(209, 67, 67, 0.08)",
    missingStroke: "#D14343",
  },
} as const;
