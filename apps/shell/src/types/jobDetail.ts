export type JobDetailTabKey = "WOF" | "Mechanical" | "Paint" | "Log" | "Invoice";

export type VehicleInfo = {
  plate: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  engine?: string;
  regoExpiry?: string;
  colour?: string;
  bodyStyle?: string;
  engineNo?: string;
  chassis?: string;
  ccRating?: number;
  fuelType?: string;
  seats?: number;
  countryOfOrigin?: string;
  grossVehicleMass?: number;
  refrigerant?: string;
  fuelTankCapacityLitres?: number;
  fullCombinedRangeKm?: number;
  wofExpiry?: string;
  odometer?: number;
  nzFirstRegistration?: string;
  customerId?: number;
  updatedAt?: string;
  rawJson?: Record<string, unknown> | string | null;
};

export type CustomerInfo = {
  type: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  accountTerms: string;
  discount: string;
  notes: string;
};

export type JobDetailData = {
  id: string;
  status: string;
  isUrgent: boolean;
  tags: string[];
  vehicle: VehicleInfo;
  customer: CustomerInfo;
};
