import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Boxes, FileText, Plus, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, SectionCard, Textarea, useToast } from "@/components/ui";
import {
  ActionsRow,
  CustomerSection,
  NotesSection,
  ServicesSection,
  VehicleSection,
  extractVehicleInfo,
  normalizePlateInput,
  serviceOptions,
  type BusinessOption,
  type CustomerType,
  type ImportState,
  type ServiceType,
  type VehicleInfo,
} from "@/features/newJob";
import { withApiBase } from "@/utils/api";

export function NewJobPage() {
  type MechOptionId = "tire" | "oil" | "brake" | "battery" | "filter" | "other";
  const navigate = useNavigate();
  const toast = useToast();
  const [rego, setRego] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [importError, setImportError] = useState("");
  const [lastRequestedPlate, setLastRequestedPlate] = useState("");
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("personal");
  const [personalName, setPersonalName] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");
  // const [personalWechat, setPersonalWechat] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [businessOptions, setBusinessOptions] = useState<BusinessOption[]>([]);
  const [notes, setNotes] = useState("");
  const [needsPo, setNeedsPo] = useState(true);
  const [paintPanels, setPaintPanels] = useState("1");
  const [partsDescriptions, setPartsDescriptions] = useState<string[]>([""]);
  const [mechOptions, setMechOptions] = useState<MechOptionId[]>([]);
  const [formAlert, setFormAlert] = useState<{ variant: "error" | "success"; message: string } | null>(
    null
  );
  const autoNotesRef = useRef("");
  const regoYearModelLabel = useMemo(() => {
    const parts = [rego, vehicleInfo?.year, vehicleInfo?.model]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .map((value) => value.replace(/\s+/g, ""));
    return parts.join("-");
  }, [rego, vehicleInfo?.year, vehicleInfo?.model]);

  const showNeedsPo = customerType === "business" && selectedServices.includes("mech");
  const showPaintPanels = selectedServices.includes("paint");

  const serviceLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    serviceOptions.forEach((opt) => {
      map[opt.id] = opt.label;
    });
    return map;
  }, []);
  const mechOptionChoices = useMemo(
    () => [
      { id: "tire" as const, label: "补胎" },
      { id: "oil" as const, label: "换机油" },
      { id: "brake" as const, label: "换刹车片" },
      { id: "battery" as const, label: "换电池" },
      { id: "filter" as const, label: "换滤芯" },
      { id: "other" as const, label: "其他机修" },
    ],
    []
  );
  const mechOptionLabelMap = useMemo(
    () => ({
      tire: "补胎",
      oil: "换机油",
      brake: "换刹车片",
      battery: "换电池",
      filter: "换滤芯",
      other: "其他机修",
    }),
    []
  );
  const selectedMechOptionLabels = useMemo(
    () => mechOptions.map((id) => mechOptionLabelMap[id]).filter(Boolean),
    [mechOptions, mechOptionLabelMap]
  );
  const mechOptionsLine = useMemo(() => {
    if (!selectedMechOptionLabels.length) return "";
    return `机修项目：${selectedMechOptionLabels.join("，")}`;
  }, [selectedMechOptionLabels]);
  const normalizedPartsDescriptions = useMemo(
    () => partsDescriptions.map((item) => item.trim()).filter(Boolean),
    [partsDescriptions]
  );
  const partsSummaryLine = useMemo(() => {
    if (!normalizedPartsDescriptions.length) return "";
    return `配件：${normalizedPartsDescriptions.join("，")}`;
  }, [normalizedPartsDescriptions]);

  const autoNotes = useMemo(() => {
    const items: string[] = [];
    if (selectedServices.includes("wof")) items.push(serviceLabelMap.wof || "WOF");
    if (selectedServices.includes("mech")) {
      items.push(showNeedsPo && needsPo ? "机修(需要PO)" : "机修");
    }
    if (selectedServices.includes("paint")) {
      items.push(`喷漆(${paintPanels || "1"}片)`);
    }
    const mechOptionText =
      selectedServices.includes("mech") && mechOptionsLine ? mechOptionsLine : "";
    const partsText = partsSummaryLine;
    if (items.length === 0 && !partsText && !mechOptionText) return "";
    const lines: string[] = [];
    if (items.length > 0) lines.push(`服务：${items.join("，")}`);
    if (mechOptionText) lines.push(mechOptionText);
    if (partsText) lines.push(partsText);
    return lines.join("\n");
  }, [
    selectedServices,
    showNeedsPo,
    needsPo,
    paintPanels,
    serviceLabelMap,
    partsSummaryLine,
    mechOptionsLine,
  ]);

  useEffect(() => {
    let cancelled = false;
    const loadBusinesses = async () => {
      try {
        const res = await fetch(withApiBase("/api/customers"));
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "加载商户失败");
        }
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          const businesses = list
            .filter((item) => String(item?.type || "").toLowerCase() === "business")
            .map((item) => ({
              id: String(item.id),
              label: String(item.name || ""),
              businessCode: item.businessCode ? String(item.businessCode) : undefined,
            }))
            .filter((item) => item.label);
          setBusinessOptions(businesses);
        }
      } catch {
        if (!cancelled) {
          setBusinessOptions([]);
        }
      }
    };
    loadBusinesses();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (showNeedsPo) {
      setNeedsPo(true);
    } else {
      setNeedsPo(false);
    }
  }, [showNeedsPo]);

  useEffect(() => {
    if (showPaintPanels) {
      setPaintPanels((prev) => (prev ? prev : "1"));
    } else {
      setPaintPanels("1");
    }
  }, [showPaintPanels]);

  useEffect(() => {
    if (!selectedServices.includes("mech")) {
      setMechOptions([]);
    }
  }, [selectedServices]);

  useEffect(() => {
    const prevAuto = autoNotesRef.current;
    const current = notes;
    if (!prevAuto) {
      if (!current.trim() && autoNotes) {
        setNotes(autoNotes);
      }
      autoNotesRef.current = autoNotes;
      return;
    }
    if (current.startsWith(prevAuto)) {
      const suffix = current.slice(prevAuto.length).trimStart();
      const next = autoNotes ? `${autoNotes}${suffix ? `\n${suffix}` : ""}` : suffix;
      if (next !== current) {
        setNotes(next);
      }
      autoNotesRef.current = autoNotes;
      return;
    }
    if (!current.trim() && autoNotes) {
      setNotes(autoNotes);
    }
    autoNotesRef.current = autoNotes;
  }, [autoNotes, notes]);

  const toggleService = (service: ServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };
  const toggleMechOption = (id: MechOptionId) => {
    setMechOptions((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const resetImportState = () => {
    setImportState("idle");
    setImportError("");
    setVehicleInfo(null);
  };

  const fetchVehicleFromDb = async (plate: string) => {
    const res = await fetch(withApiBase(`/api/vehicles/by-plate?plate=${encodeURIComponent(plate)}`));
    const data = await res.json().catch(() => null);

    if (res.ok) return data;
    if (res.status === 404) return null;
    throw new Error(data?.error || "读取数据库失败");
  };

  const importVehicle = async (plate: string) => {

    //  console.log('in importVehicle:', plate, lastRequestedPlate, importState);
    if (plate === lastRequestedPlate || importState === "loading") return;
    setLastRequestedPlate(plate);
    setImportState("loading");
    setImportError("");
    setVehicleInfo(null);

    try {
     
      const res = await fetch(withApiBase("/api/carjam/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "导入失败，请稍后重试 or Link");
      }

      const dbData = await fetchVehicleFromDb(plate);
      if (!dbData) {
        throw new Error("已导入，但未在数据库中找到车辆");
      }

      console.log("vehicle from db", dbData?.vehicle ?? dbData);
      setVehicleInfo(extractVehicleInfo(dbData));
      setImportState("success");
    } catch (err) {
      setImportState("error");
      setImportError(err instanceof Error ? err.message : "导入失败，请稍后重试");
    }
  };

  const handleImportClick = async () => {
    const normalized = normalizePlateInput(rego);
    if (!normalized) return;

    try {
      setImportState("loading");
      setImportError("");
      setVehicleInfo(null);

      const dbData = await fetchVehicleFromDb(normalized);
      if (dbData) {
        console.log("vehicle from db", dbData?.vehicle ?? dbData);
        setVehicleInfo(extractVehicleInfo(dbData));
        setImportState("success");
        return;
      }

      setImportState("idle");
      await importVehicle(normalized);
    } catch (err) {
      setImportState("error");
      setImportError(err instanceof Error ? err.message : "导入失败，请稍后重试");
    }
  };

  const handleRegoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizePlateInput(event.target.value);
    if (normalized === null) return;

    setRego(normalized);
    resetImportState();
  };

  const handleSave = async () => {
    setFormAlert(null);
    if (!rego) {
      setFormAlert({ variant: "error", message: "请输入车牌号" });
      return;
    }

    const selectedBusiness = businessOptions.find((biz) => biz.id === businessId);
    const hasMech = selectedServices.includes("mech");
    const personalHasInfo = [
      personalName,
      personalPhone,
      // personalWechat,
      personalEmail,
      customerAddress,
    ].some((value) => value.trim());
    const fallbackName = regoYearModelLabel || rego.trim();
    const customerName =
      customerType === "personal"
        ? personalHasInfo
          ? personalName
          : fallbackName
        : selectedBusiness?.label ?? "";


 
    
    const customerPayload =
      customerType === "personal"
        ? {
            type: customerType,
            name: customerName,
            phone: personalPhone || undefined,
            email: personalEmail || undefined,
            address: customerAddress || undefined,
            notes: fallbackName,
          }
        : {
            type: customerType,
            name: customerName,
            businessCode: selectedBusiness?.businessCode ?? selectedBusiness?.id,
            notes: fallbackName,
          };
    const trimmedNotes = notes.trim();
    const baseNotes = trimmedNotes ? trimmedNotes : autoNotes;
    const partsText = partsSummaryLine;
    let notesPayload = regoYearModelLabel;
    if (baseNotes) {
      notesPayload = notesPayload ? `${notesPayload}\n${baseNotes}` : baseNotes;
    }
    if (partsText) {
      const hasPartsAlready = notesPayload.includes(partsText);
      if (!hasPartsAlready) {
        notesPayload = notesPayload ? `${notesPayload}\n${partsText}` : partsText;
      }
    }
    if (hasMech && mechOptionsLine) {
      const hasMechOptionsAlready = notesPayload.includes(mechOptionsLine);
      if (!hasMechOptionsAlready) {
        notesPayload = notesPayload ? `${notesPayload}\n${mechOptionsLine}` : mechOptionsLine;
      }
    }

 console.log("===========save body============");
  console.log(" plate:", rego);
  console.log(" services:", selectedServices);
  console.log(" notesPayload:", notesPayload);
  console.log(" partsDescriptions:", normalizedPartsDescriptions.length ? normalizedPartsDescriptions : undefined);
  console.log(" businessId:", customerType === "business" ? businessId : undefined);
  console.log(" customer:", customerPayload);



    try {
      
      const res = await fetch(withApiBase("/api/newJob"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: rego,
          services: selectedServices,
          notes: notesPayload,
          partsDescription: normalizedPartsDescriptions[0],
          partsDescriptions: normalizedPartsDescriptions,
          mechItems: hasMech ? selectedMechOptionLabels : [],
          paintPanels: showPaintPanels ? Number(paintPanels) || 1 : undefined,
          businessId: customerType === "business" ? businessId : undefined,
          customer: customerPayload,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "工单保存失败，请稍后重试");
      }

      console.log("++++++++++++++++++++job created", data);
      setFormAlert({ variant: "success", message: "工单保存成功！" });
      toast.success("工单保存成功！");
      const createdId = data?.jobId ? String(data.jobId) : "";
      if (createdId) {
        navigate(`/jobs/${createdId}`);
      } else {
        navigate("/jobs");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "工单保存失败，请稍后重试");
      setFormAlert({
        variant: "error",
        message: err instanceof Error ? err.message : "工单保存失败，请稍后重试",
      });
    }
  };

  const handlePaintPanelsChange = (value: string) => {
    if (value === "") {
      setPaintPanels("");
      return;
    }
    if (!/^\d+$/.test(value)) return;
    const num = Math.min(20, Math.max(1, Number(value)));
    setPaintPanels(String(num));
  };
  const updatePartDescription = (index: number, value: string) => {
    setPartsDescriptions((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };
  const addPartDescription = () => {
    setPartsDescriptions((prev) => [...prev, ""]);
  };
  const removePartDescription = (index: number) => {
    setPartsDescriptions((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, idx) => idx !== index);
    });
  };

  return (
    <div className="space-y-4 text-[14px]">
      <div className="flex items-center gap-3">
        <Link to="/jobs" className="text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.70)]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">新建工单</h1>
      </div>

      {formAlert ? (
        <Alert
          variant={formAlert.variant}
          description={formAlert.message}
          onClose={() => setFormAlert(null)}
        />
      ) : null}

      <VehicleSection
        rego={rego}
        importState={importState}
        importError={importError}
        vehicleInfo={vehicleInfo}
        onRegoChange={handleRegoChange}
        onImport={handleImportClick}
      />

  

      <CustomerSection
        customerType={customerType}
        onCustomerTypeChange={setCustomerType}
        personalName={personalName}
        personalPhone={personalPhone}
        // personalWechat={personalWechat}
        personalEmail={personalEmail}
        onPersonalNameChange={setPersonalName}
        onPersonalPhoneChange={setPersonalPhone}
        // onPersonalWechatChange={setPersonalWechat}
        onPersonalEmailChange={setPersonalEmail}
        customerAddress={customerAddress}
        onCustomerAddressChange={setCustomerAddress}
        businessId={businessId}
        businessOptions={businessOptions}
        onBusinessChange={setBusinessId}
      />
      <ServicesSection
        selectedServices={selectedServices}
        onToggleService={toggleService}
        options={serviceOptions}
        mechOptionChoices={mechOptionChoices}
        mechOptions={mechOptions}
        onToggleMechOption={toggleMechOption}
        showPaintPanels={showPaintPanels}
        paintPanels={paintPanels}
        onPaintPanelsChange={handlePaintPanelsChange}
      />

      <SectionCard
        title="订配件"
        titleIcon={<Boxes size={18} />}
        titleClassName="text-base font-semibold"
        actions={
          <button
            type="button"
            onClick={addPartDescription}
            className="inline-flex items-center gap-1 rounded-[8px] border border-[rgba(220,38,38,0.40)] bg-[rgba(220,38,38,0.05)] px-2.5 py-1.5 text-sm font-medium text-[#b91c1c] hover:bg-[rgba(220,38,38,0.10)]"
          >
            <Plus size={14} />
            配件
          </button>
        }
      >
          <div className="space-y-3 mt-2">
              {partsDescriptions.map((value, index) => (
                <div key={`part-item-${index}`} className="rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm text-[rgba(0,0,0,0.65)]">配件 {index + 1}</label>
                    <button
                      type="button"
                      onClick={() => removePartDescription(index)}
                      className="inline-flex items-center gap-1 text-xs text-[rgba(0,0,0,0.50)] hover:text-[#b91c1c]"
                    >
                      <X size={14} />
                      删除
                    </button>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="输入配件描述"
                    value={value}
                    onChange={(event) => updatePartDescription(index, event.target.value)}
                  />
                </div>
              ))}
            </div>
      
      </SectionCard>

      {showNeedsPo ? (
        <SectionCard title="采购订单 (PO)" titleIcon={<FileText size={18} />} titleClassName="text-base font-semibold">
          <div className="mt-4 flex items-center justify-between gap-4 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.01)] p-4">
            <div>
              <div className="text-base font-semibold text-[rgba(0,0,0,0.86)]">需要 PO</div>
              <div className="text-sm text-[rgba(0,0,0,0.55)]">商户订单是否需要采购订单号</div>
            </div>
            <label className="inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={needsPo}
                onChange={(event) => setNeedsPo(event.target.checked)}
                className="peer sr-only"
              />
              <span className="relative h-7 w-12 rounded-full bg-[rgba(0,0,0,0.20)] transition peer-checked:bg-[#dc2626]">
                <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
              </span>
            </label>
          </div>
        </SectionCard>
      ) : null}

      <NotesSection notes={notes} onNotesChange={setNotes} />

      <ActionsRow onSave={handleSave} />
    </div>
  );
}
