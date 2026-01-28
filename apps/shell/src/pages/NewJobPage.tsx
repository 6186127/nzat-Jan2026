import { useState } from "react";
import { ArrowLeft, Wrench, Droplets, FileText } from "lucide-react";
import { Link } from "react-router-dom";

type ServiceType = "wof" | "mech" | "paint";
type CustomerType = "personal" | "business";

const serviceOptions = [
    { id: "wof", label: "WOF", icon: FileText },
    { id: "mech", label: "机修", icon: Wrench },
    { id: "paint", label: "喷漆", icon: Droplets },
];

const businessOptions = [
    { id: "biz1", label: "ABC 汽车维修厂" },
    { id: "biz2", label: "XYZ 汽车服务" },
    { id: "biz3", label: "123 维修中心" },
];

function Card(props: { children: React.ReactNode; className?: string; title?: string }) {
    return (
        <div
            className={[
                "rounded-[12px] border border-[var(--ds-border)] bg-white shadow-sm p-4",
                props.className || "",
            ].join(" ")}
        >
            {props.title && (
                <h3 className="text-sm font-semibold text-[rgba(0,0,0,0.72)] mb-3">{props.title}</h3>
            )}
            {props.children}
        </div>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={[
                "h-9 w-full rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white px-3 text-sm",
                "outline-none focus:border-[rgba(37,99,235,0.45)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]",
                props.className || "",
            ].join(" ")}
        />
    );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={[
                "h-9 w-full rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white px-3 text-sm",
                "outline-none focus:border-[rgba(37,99,235,0.45)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]",
                props.className || "",
            ].join(" ")}
        />
    );
}

function Button(props: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "ghost";
    leftIcon?: React.ReactNode;
    type?: "button" | "submit";
}) {
    const v = props.variant ?? "ghost";
    const cls =
        v === "primary"
            ? "bg-[var(--ds-primary)] text-white hover:opacity-95"
            : "bg-white text-[rgba(0,0,0,0.72)] border border-[rgba(0,0,0,0.10)] hover:bg-[rgba(0,0,0,0.03)]";

    return (
        <button
            onClick={props.onClick}
            type={props.type}
            className={[
                "h-9 inline-flex items-center gap-2 rounded-[8px] px-4 text-sm font-medium transition",
                cls,
            ].join(" ")}
        >
            {props.leftIcon}
            {props.children}
        </button>
    );
}

export function NewJobPage() {
    const [rego, setRego] = useState("");
    const [vehicleInfo, setVehicleInfo] = useState<{ model?: string; year?: string } | null>(null);
    const [importState, setImportState] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [importError, setImportError] = useState("");
    const [lastRequestedPlate, setLastRequestedPlate] = useState("");
    const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
    const [customerType, setCustomerType] = useState<CustomerType>("personal");
    const [personalName, setPersonalName] = useState("");
    const [personalPhone, setPersonalPhone] = useState("");
    const [personalWechat, setPersonalWechat] = useState("");
    const [personalEmail, setPersonalEmail] = useState("");
    const [businessId, setBusinessId] = useState("");
    const [notes, setNotes] = useState("");

    const toggleService = (service: ServiceType) => {
        setSelectedServices((prev) =>
            prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
        );
    };

    const importVehicle = async (plate: string) => {
        if (plate === lastRequestedPlate || importState === "loading") return;
        setLastRequestedPlate(plate);
        setImportState("loading");
        setImportError("");
        setVehicleInfo(null);

        try {
            const res = await fetch("/api/carjam/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plate }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || "导入失败，请稍后重试");
            }

            const make = data?.vehicle?.make ? String(data.vehicle.make) : "";
            const model = data?.vehicle?.model ? String(data.vehicle.model) : "";
            const year = data?.vehicle?.year ? String(data.vehicle.year) : "";

            setVehicleInfo({
                model: [make, model].filter(Boolean).join(" "),
                year,
            });
            setImportState("success");
        } catch (err) {
            setImportState("error");
            setImportError(err instanceof Error ? err.message : "导入失败，请稍后重试");
        }
    };

    const handleRegoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.toUpperCase();
        
        // 只允许字母和数字，移除其他字符
        value = value.replace(/[^A-Z0-9]/g, "");
        
        // 限制最长 8 个字符
        if (value.length <= 8) {
            setRego(value);

            if (value.length >= 6) {
                importVehicle(value);
            } else {
                setImportState("idle");
                setImportError("");
                setVehicleInfo(null);
            }
        }
    };

    const handleSave = () => {
        if (!rego) {
            alert("请输入车牌号");
            return;
        }
        if (selectedServices.length === 0) {
            alert("请选择服务项目");
            return;
        }
        if (customerType === "personal" && !personalName) {
            alert("请输入客户名字");
            return;
        }
        if (customerType === "business" && !businessId) {
            alert("请选择商户");
            return;
        }

        console.log({
            rego,
            vehicleInfo,
            selectedServices,
            customerType,
            personalName,
            personalPhone,
            personalWechat,
            personalEmail,
            businessId,
            notes,
        });

        alert("保存成功！");
    };

    return (
        <div className="space-y-4 text-[14px]">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link to="/jobs" className="text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.70)]">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">新建工单</h1>
            </div>

            {/* Card 1: Vehicle Rego */}
             <Card title="车辆信息">
                <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1 space-y-1">
                        <label className="text-xs text-[rgba(0,0,0,0.55)] mb-1 block">
                            车牌号 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2 items-end">
                            <div className="flex-shrink-0">
                                <input
                                    placeholder="输入车牌"
                                    value={rego}
                                    onChange={handleRegoChange}
                                    maxLength={8}
                                    className={[
                                        "h-9 px-3 text-sm font-semibold text-center rounded-[8px] border-2",
                                        "outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]",
                                        "bg-white tracking-widest",
                                        "w-[140px]",
                                        rego ? "border-[var(--ds-primary)] text-[var(--ds-primary)]" : "border-[rgba(0,0,0,0.10)] text-[rgba(0,0,0,0.70)]"
                                    ].join(" ")}
                                />
                            </div>
                            {rego && (
                                <span className="text-xs text-[rgba(0,0,0,0.45)] flex-shrink-0">
                                    {rego.length}/8
                                </span>
                            )}
                        </div>
                        {importState === "loading" && (
                            <div className="text-xs text-[rgba(37,99,235,0.85)] mt-1">正在抓取车辆信息…</div>
                        )}
                        {importState === "error" && (
                            <div className="text-xs text-red-600 mt-1">{importError}</div>
                        )}
                        <div className="text-xs text-[rgba(0,0,0,0.45)] mt-1">
                            例：ABC1234
                        </div>
                    </div>

                    {vehicleInfo && importState === "success" && (
                        <div className="col-span-3 p-3 bg-[rgba(34,197,94,0.05)] rounded-[8px] border border-[rgba(34,197,94,0.20)]">
                            <div className="text-xs text-[rgba(0,0,0,0.70)]">
                                <div className="font-semibold text-[rgba(34,197,94,0.95)]">✓ 已识别车型信息</div>
                                <div className="mt-2 space-y-1">
                                    <div><span className="text-[rgba(0,0,0,0.55)]">型号：</span>{vehicleInfo.model}</div>
                                    <div><span className="text-[rgba(0,0,0,0.55)]">年份：</span>{vehicleInfo.year}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Card 2: Service Items */}
            <Card title="服务项目">
                <div className="space-y-3">
                    <label className="text-xs text-[rgba(0,0,0,0.55)] block">
                        请选择服务 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {serviceOptions.map((service) => {
                            const Icon = service.icon;
                            const isSelected = selectedServices.includes(service.id as ServiceType);
                            return (
                                <button
                                    key={service.id}
                                    onClick={() => toggleService(service.id as ServiceType)}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[8px] border-2 transition ${
                                        isSelected
                                            ? "border-[var(--ds-primary)] bg-[rgba(37,99,235,0.08)]"
                                            : "border-[rgba(0,0,0,0.10)] bg-white hover:border-[rgba(0,0,0,0.15)]"
                                    }`}
                                >
                                    <Icon
                                        size={24}
                                        className={isSelected ? "text-[var(--ds-primary)]" : "text-[rgba(0,0,0,0.45)]"}
                                    />
                                    <span
                                        className={`text-sm font-medium ${
                                            isSelected
                                                ? "text-[var(--ds-primary)]"
                                                : "text-[rgba(0,0,0,0.70)]"
                                        }`}
                                    >
                                        {service.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Card>

            {/* Card 3: Customer Info */}
            <Card title="客户信息">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-[rgba(0,0,0,0.55)] mb-2 block">
                            客户类型 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-3">
                            {["personal", "business"].map((type) => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="customerType"
                                        value={type}
                                        checked={customerType === type}
                                        onChange={() => setCustomerType(type as CustomerType)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm text-[rgba(0,0,0,0.70)]">
                                        {type === "personal" ? "个人" : "商户"}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {customerType === "personal" ? (
                        <div className="grid grid-cols-2 gap-3 ">
                            <div>
                                <label className="text-xs text-[rgba(0,0,0,0.55)] mb-1 block">
                                    名字 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    placeholder="输入客户名字"
                                    value={personalName}
                                    onChange={(e) => setPersonalName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[rgba(0,0,0,0.55)] mb-1 block">电话</label>
                                <Input
                                    placeholder="输入电话"
                                    value={personalPhone}
                                    onChange={(e) => setPersonalPhone(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[rgba(0,0,0,0.55)] mb-1 block">微信</label>
                                <Input
                                    placeholder="输入微信"
                                    value={personalWechat}
                                    onChange={(e) => setPersonalWechat(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[rgba(0,0,0,0.55)] mb-1 block">邮箱</label>
                                <Input
                                    placeholder="输入邮箱"
                                    value={personalEmail}
                                    onChange={(e) => setPersonalEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="text-xs text-[rgba(0,0,0,0.55)] mb-1 block">
                                选择商户 <span className="text-red-500">*</span>
                            </label>
                            <Select value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
                                <option value="">-- 请选择 --</option>
                                {businessOptions.map((biz) => (
                                    <option key={biz.id} value={biz.id}>
                                        {biz.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}
                </div>
            </Card>

            {/* Card 4: Notes */}
            <Card title="备注">
                <div>
                    <label className="text-xs text-[rgba(0,0,0,0.55)] mb-1 block">备注信息（选填）</label>
                    <textarea
                        placeholder="输入备注信息"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className={[
                            "w-full rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white px-3 py-2 text-sm",
                            "outline-none focus:border-[rgba(37,99,235,0.45)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]",
                            "resize-none",
                        ].join(" ")}
                    />
                </div>
            </Card>

            {/* section 5: Action Buttons */}
            
                <div className="flex gap-3 justify-end bg-transparent p-0">
                    <Link to="/jobs">
                        <Button variant="ghost">取消</Button>
                    </Link>
                    <Button variant="primary" onClick={handleSave}>
                        保存
                    </Button>
                </div>
            
        </div>
    );
}
