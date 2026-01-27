import { Trash2 } from "lucide-react";

interface WofResultsCardProps {
  wofResults: {
     id: string;
     date: string;
     source: string;
     status: "Pass" | "Fail";
     expiryDate: string;
     notes: string;
    failReason?: string;
  }[];
  onDelete?: (id: string) => void;
}

export function WofResultsCard({ wofResults, onDelete }: WofResultsCardProps) {
  return (
 <div className="space-y-3">
            {wofResults.map((record) => (
              <div 
                key={record.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">{record.date}</span>
                      <span className="text-xs text-gray-500">Source: {record.source}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'Pass' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                      {record.status === "Fail" ? (
                        <span className="text-xs text-red-600">Expiry recheck Date: {record.expiryDate}</span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                     
                      {record.failReason ? (
                        <p className="text-xs text-gray-500 md:text-sm">Fail Reason: {record.failReason}</p>
                      ) : null}
                       <p className="text-gray-600">{record.notes}</p>
                    </div>
                  </div>
                  {onDelete ? (
                    <button
                      onClick={() => onDelete(record.id)}
                      className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-red-600"
                      aria-label="Delete result"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            </div>
    );
}
