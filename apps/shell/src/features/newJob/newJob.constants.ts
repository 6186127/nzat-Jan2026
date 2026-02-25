import { Wrench, Droplets, FileText } from "lucide-react";
import type { ServiceOption, BusinessOption } from "./newJob.types";

export const serviceOptions: ServiceOption[] = [
  { id: "wof", label: "WOF", icon: FileText },
  { id: "mech", label: "机修", icon: Wrench },
  { id: "paint", label: "喷漆", icon: Droplets },
];

