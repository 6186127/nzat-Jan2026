import type { JobDetailData } from "@/types";

export const jobDetailMock: JobDetailData = {
  id: "JOB-2024-1234",
  status: "In Shop",
  isUrgent: true,
  tags: ["Regular Customer", "Insurance"],
  vehicle: {
    plate: "ABC123",
    make: "Toyota",
    model: "Camry",
    year: 2020,
    vin: "1HGBH41JXMN109186",
    engine: "2.5L 4-Cylinder",
    regoExpiry: "2024-06-15",
    wofExpiry: "2024-03-20",
  },
  customer: {
    type: "Business",
    name: "John Smith Motors Ltd",
    phone: "+64 21 123 4567",
    email: "john@example.com",
    address: "123 Main St, Auckland 1010",
    accountTerms: "30 days",
    discount: "10%",
    notes: "Preferred customer - priority service",
  },
};
