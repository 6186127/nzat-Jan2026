export type Status = "pending_order" | "needs_pt" | "parts_trader" | "pickup_or_transit";

export interface Note {
  id: string;
  text: string;
  timestamp: Date;
}

export interface CarDetails {
  owner: string;
  phone: string;
  vin: string;
  mileage: string;
  issue: string;
}

export interface WorkCard {
  id: string;
  carInfo: string;
  parts: string[];
  status: Status;
  notes: Note[];
  isArchived: boolean;
  createdAt: Date;
  details: CarDetails;
}
