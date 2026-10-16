/** Uploaded/source artwork. One artwork may be placed many times. */
export interface ArtworkItem {
  id: string;
  filename: string;
  mimeType: string;
  originalWidthPx: number;
  originalHeightPx: number;
  fileSizeBytes: number;
  /** Working copy (possibly downscaled) used for editing and preview. */
  dataUrl?: string;
  /** false when the browser storage quota prevented saving the image data. */
  persisted: boolean;
  source: "upload" | "sample";
  fingerprint: string;
  createdAt: string;
}

/**
 * Placement coordinate system: physical inches. (0,0) is the sheet's top-left
 * corner. x/y describe the top-left of the UNROTATED box; rotation is applied
 * clockwise around the box centre.
 */
export interface SheetArtworkPlacement {
  id: string;
  artworkId: string;
  xInches: number;
  yInches: number;
  widthInches: number;
  heightInches: number;
  rotationDegrees: number;
  zIndex: number;
  lockAspect: boolean;
}

export interface GangSheetProject {
  id: string;
  name: string;
  sheetWidthInches: number;
  sheetLengthInches: number;
  placements: SheetArtworkPlacement[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  project: GangSheetProject;
  quantity: number;
  unitPrice: number;
  previewDataUrl?: string;
  addedAt: string;
}

export interface CustomerDetails {
  fullName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  notes?: string;
}

export type OrderStatus = "pending_review" | "approved" | "in_production" | "completed" | "cancelled";

export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerDetails;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingEstimate: number;
  taxEstimate: number;
  total: number;
  createdAt: string;
  statusHistory: { status: OrderStatus; at: string }[];
  demoMode: true;
  isSeed?: boolean;
}

export interface PriceLine {
  label: string;
  amount: number;
}

export interface PriceSummary {
  linearInches: number;
  sheetCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  lines: PriceLine[];
}

export type ValidationLevel = "ok" | "warning" | "error";
export interface ValidationIssue {
  level: ValidationLevel;
  code: "out_of_bounds" | "overlap" | "missing_artwork" | "empty_sheet" | "invalid_size";
  message: string;
  placementIds: string[];
}
