export type JobDetailTabKey = "WOF" | "Mechanical" | "Paint" | "Log" | "Invoice";

export type VehicleInfo = {
  plate: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  engine: string;
  regoExpiry: string;
  wofExpiry: string;
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
