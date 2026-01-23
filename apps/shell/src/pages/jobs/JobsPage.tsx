import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Input, Select, Button } from "@/components/ui";
import { StatusPill, ProgressRing, TagsCell } from "@/components/jobs";
import { Search, Archive, Trash2, RotateCcw, ChevronDown, Plus } from "lucide-react"; import { MultiTagSelect, type TagOption } from "../../components/MultiTagSelect";
import type { JobsFilters, JobRow, JobStatus } from "@/types/JobType";
import { filterJobs, sortSelected, paginate } from "@/utils/jobs.utils";
import { useEffect } from "react";
import { JobsFiltersCard } from "./JobsFiltersCard";
import { JobsTable } from "./JobsTable";
import { JobsPagination } from "./JobsPagination";

const DEFAULT_FILTERS: JobsFilters = {
  search: "",
  jobType: "",
  timeRange: "",
  startDate: "",
  endDate: "",
  customer: "",
  selectedTags: [],
};

const tagOptions: TagOption[] = [
    { id: "badge", label: "Badge" },
    { id: "vip", label: "VIP" },
    { id: "urgent", label: "Urgent" },
    { id: "parts", label: "Parts" },
    { id: "repeat", label: "Repeat" },
];


const mockRows: JobRow[] = [
    {
        id: "J-20251206",
        vehicleStatus: "In Progress",
        selectedTags: ["Badge", "VIP", "Urgent", "Parts"],
        plate: "XYZ789",
        vehicleModel: "Toyota Corolla 2018",
        wofPct: 23,
        mechPct: 58,
        paintPct: 68,
        customerName: "王伟",
        customerPhone: "0218796689",
        createdAt: "2025/12/06 10:55",
    },
    {
        id: "J-20251206-2",
        vehicleStatus: "Ready",
        selectedTags: ["Repeat"],
        plate: "CCTV001",
        vehicleModel: "Toyota Corolla 2018",
        wofPct: 100,
        mechPct: null,
        paintPct: null,
        customerName: "王伟",
        customerPhone: "0218796689",
        createdAt: "2026/01/20",
    },
    {
        id: "J-20251206-3",
        vehicleStatus: "Cancelled",
        selectedTags: [],
        plate: "CCTV001",
        vehicleModel: "Toyota Corolla 2018",
        wofPct: 0,
        mechPct: null,
        paintPct: null,
        customerName: "王伟",
        customerPhone: "0218796689",
        createdAt: "2026/01/06",
    },
    {
        id: "J-20251207",
        vehicleStatus: "In Progress",
        selectedTags: ["VIP"],
        plate: "ABC123",
        vehicleModel: "Honda Civic 2020",
        wofPct: 45,
        mechPct: 30,
        paintPct: 50,
        customerName: "李明",
        customerPhone: "0229876543",
        createdAt: "2025/12/07 14:20",
    },
    {
        id: "J-20251208",
        vehicleStatus: "Completed",
        selectedTags: ["Badge", "Parts"],
        plate: "DEF456",
        vehicleModel: "Mazda 3 2019",
        wofPct: 100,
        mechPct: 100,
        paintPct: 100,
        customerName: "张三",
        customerPhone: "0218765432",
        createdAt: "2025/12/08 09:15",
    },
    {
        id: "J-20251209",
        vehicleStatus: "Pending",
        selectedTags: ["Urgent"],
        plate: "GHI789",
        vehicleModel: "Nissan Altima 2021",
        wofPct: 0,
        mechPct: 0,
        paintPct: 0,
        customerName: "王芳",
        customerPhone: "0219876543",
        createdAt: "2025/12/09 16:45",
    },
    {
        id: "J-20251210",
        vehicleStatus: "Ready",
        selectedTags: ["Repeat", "VIP"],
        plate: "JKL012",
        vehicleModel: "Toyota Prius 2018",
        wofPct: 100,
        mechPct: 85,
        paintPct: 90,
        customerName: "刘强",
        customerPhone: "0218654321",
        createdAt: "2025/12/10 11:30",
    },
    {
        id: "J-20251211",
        vehicleStatus: "In Progress",
        selectedTags: ["Badge"],
        plate: "MNO345",
        vehicleModel: "BMW X5 2020",
        wofPct: 60,
        mechPct: 40,
        paintPct: 70,
        customerName: "陈婷",
        customerPhone: "0229654321",
        createdAt: "2025/12/11 13:00",
    },
    {
        id: "J-20251212",
        vehicleStatus: "Archived",
        selectedTags: [],
        plate: "PQR678",
        vehicleModel: "Audi A4 2019",
        wofPct: 100,
        mechPct: 100,
        paintPct: 100,
        customerName: "周杰",
        customerPhone: "0218543210",
        createdAt: "2025/12/12 08:20",
    },
    {
        id: "J-20251213",
        vehicleStatus: "Cancelled",
        selectedTags: ["Parts"],
        plate: "STU901",
        vehicleModel: "Mercedes-Benz C-Class 2021",
        wofPct: 20,
        mechPct: 15,
        paintPct: 10,
        customerName: "吴美",
        customerPhone: "0219543210",
        createdAt: "2025/12/13 10:45",
    },
    {
        id: "J-20251214",
        vehicleStatus: "In Progress",
        selectedTags: ["VIP", "Urgent"],
        plate: "VWX234",
        vehicleModel: "Subaru Outback 2020",
        wofPct: 55,
        mechPct: 65,
        paintPct: 45,
        customerName: "徐磊",
        customerPhone: "0218432109",
        createdAt: "2025/12/14 15:15",
    },
    {
        id: "J-20251215",
        vehicleStatus: "Ready",
        selectedTags: ["Badge", "Repeat"],
        plate: "YZA567",
        vehicleModel: "Hyundai Elantra 2019",
        wofPct: 100,
        mechPct: 95,
        paintPct: 100,
        customerName: "黄强",
        customerPhone: "0229432109",
        createdAt: "2025/12/15 12:30",
    },
    {
        id: "J-20251216",
        vehicleStatus: "Completed",
        selectedTags: ["VIP"],
        plate: "BCD890",
        vehicleModel: "Kia Optima 2020",
        wofPct: 100,
        mechPct: 100,
        paintPct: 100,
        customerName: "赵敏",
        customerPhone: "0218321098",
        createdAt: "2025/12/16 09:50",
    },
    {
        id: "J-20251217",
        vehicleStatus: "Pending",
        selectedTags: ["Urgent"],
        plate: "EFG123",
        vehicleModel: "Volkswagen Golf 2021",
        wofPct: 10,
        mechPct: 5,
        paintPct: 0,
        customerName: "孙芳",
        customerPhone: "0219321098",
        createdAt: "2025/12/17 14:25",
    },
    {
        id: "J-20251218",
        vehicleStatus: "In Progress",
        selectedTags: ["Badge", "Parts", "VIP"],
        plate: "HIJ456",
        vehicleModel: "Lexus ES 2020",
        wofPct: 75,
        mechPct: 80,
        paintPct: 85,
        customerName: "周冰",
        customerPhone: "0218210987",
        createdAt: "2025/12/18 11:10",
    },
    {
        id: "J-20251219",
        vehicleStatus: "Ready",
        selectedTags: ["Repeat"],
        plate: "KLM789",
        vehicleModel: "Volvo XC90 2019",
        wofPct: 100,
        mechPct: 90,
        paintPct: 95,
        customerName: "吕超",
        customerPhone: "0229210987",
        createdAt: "2025/12/19 16:40",
    },
    {
        id: "J-20251220",
        vehicleStatus: "Completed",
        selectedTags: ["Badge"],
        plate: "NOP012",
        vehicleModel: "Tesla Model 3 2021",
        wofPct: 100,
        mechPct: 100,
        paintPct: 100,
        customerName: "朱琳",
        customerPhone: "0218109876",
        createdAt: "2025/12/20 13:35",
    },
];



export function JobsPage() {
    const [jobType, setJobType] = useState("");
    const [timeRange, setTimeRange] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [customer, setCustomer] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 6;
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    
    const filters = useMemo<JobsFilters>(() => ({
        search,
        jobType: (jobType as any) || "",
        timeRange: (timeRange as any) || "",
        startDate,
        endDate,
        customer,
        selectedTags,
    }), [search, jobType, timeRange, startDate, endDate, customer, selectedTags]);

    const rows = useMemo(() => {
        const filtered = filterJobs(mockRows, filters);
        return sortSelected(filtered, selectedIds);
    }, [filters, selectedIds]);


    //pageination
    const { pageRows: paginatedRows, totalPages } = useMemo(
        () => paginate(rows, currentPage, pageSize),
        [rows, currentPage, pageSize]
    );
    
        useEffect(() => {
  setCurrentPage(1);
}, [filters]);



    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    return (

        <div className="space-y-4 text-[14px]">

            <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">Jobs</h1>

          <JobsFiltersCard
  value={filters}
  onChange={(newFilters) => {
    setSearch(newFilters.search);
    setJobType(newFilters.jobType);
    setTimeRange(newFilters.timeRange);
    setStartDate(newFilters.startDate);
    setEndDate(newFilters.endDate);
    setCustomer(newFilters.customer);
    setSelectedTags(newFilters.selectedTags);
  }}
  onReset={() => {
    setSearch("");
    setJobType("");
    setTimeRange("");
    setStartDate("");
    setEndDate("");
    setCustomer("");
    setSelectedTags([]);
  }}
/>

            <div className="flex justify-end">
                <Link to="/jobs/new">
                    <Button variant="primary" leftIcon={<Plus size={16} />}>
                        Add New Job
                    </Button>
                </Link>
            </div>

           <Card className="overflow-hidden">
  <JobsTable
    rows={paginatedRows}
    selectedIds={selectedIds}
    onToggleSelect={toggleSelect}
  />

  <JobsPagination
    currentPage={currentPage}
    totalPages={totalPages}
    pageSize={pageSize}
    totalItems={rows.length}
    onPageChange={setCurrentPage}
  />
</Card>
        </div>
    );
}
