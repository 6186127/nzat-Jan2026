import { Archive, Trash2, AlertCircle, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, TagPill } from "@/components/ui";
import { JOB_DETAIL_TEXT } from "@/features/jobDetail/jobDetail.constants";
import type { TagOption } from "@/components/MultiTagSelect";
import { MultiTagSelect } from "@/components/MultiTagSelect";
import { formatJobDisplayId } from "@/utils/jobId";

interface JobHeaderProps {
  jobId: string;
  status: string;
  isUrgent: boolean;
  tags: string[];
  onDelete?: () => void;
  isDeleting?: boolean;
  tagOptions?: TagOption[];
  onSaveTags?: (tagIds: string[]) => Promise<{ success: boolean; message?: string; tags?: string[] }>;
}

export function JobHeader({
  jobId,
  status,
  isUrgent,
  tags,
  onDelete,
  isDeleting,
  tagOptions = [],
  onSaveTags,
}: JobHeaderProps) {
  const [editingTags, setEditingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagMessage, setTagMessage] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [savingTags, setSavingTags] = useState(false);

  const tagIdByLabel = useMemo(() => {
    const map = new Map<string, string>();
    tagOptions.forEach((opt) => {
      map.set(opt.label, opt.id);
    });
    return map;
  }, [tagOptions]);

  useEffect(() => {
    if (tagOptions.length === 0) return;
    const ids = tags.map((t) => tagIdByLabel.get(t)).filter(Boolean) as string[];
    setSelectedTagIds(ids);
  }, [tags, tagOptions, tagIdByLabel]);

  useEffect(() => {
    if (!tagMessage && !tagError) return;
    const timer = window.setTimeout(() => {
      setTagMessage(null);
      setTagError(null);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [tagMessage, tagError]);

  const saveTags = async () => {
    if (!onSaveTags) return;
    setTagMessage(null);
    setTagError(null);
    setSavingTags(true);
    const res = await onSaveTags(selectedTagIds);
    setSavingTags(false);
    if (res.success) {
      setTagMessage(res.message || "已更新标签");
      setEditingTags(false);
    } else {
      setTagError(res.message || "更新失败");
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Shop":
        return "bg-[var(--ds-panel)] text-[var(--ds-primary)] border-[var(--ds-border)]";
      case "Completed":
        return "bg-[var(--ds-panel)] text-[var(--ds-text)] border-[var(--ds-border)]";
      case "Archived":
        return "bg-[var(--ds-panel)] text-[var(--ds-muted)] border-[var(--ds-border)]";
      default:
        return "bg-[var(--ds-panel)] text-[var(--ds-muted)] border-[var(--ds-border)]";
    }
  };

  return (
    <div className=" flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* <div className="flex flex-row gap-2"> */}
        <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
       
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--ds-text)]">{JOB_DETAIL_TEXT.labels.jobDetail}</h1>
          <p className="text-sm text-[var(--ds-muted)] mt-1">{formatJobDisplayId(jobId)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TagPill label={status} className={getStatusColor(status)} />
          {isUrgent ? (
            <TagPill
              label={JOB_DETAIL_TEXT.labels.urgent}
              variant="danger"
              leftIcon={<AlertCircle className="w-4 h-4" />}
            />
          ) : null}
          {tags.map((tag) => (
            <TagPill key={tag} label={tag} variant="primary" />
          ))}
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(0,0,0,0.10)] text-[rgba(0,0,0,0.55)] hover:text-[rgba(0,0,0,0.8)] hover:bg-[rgba(0,0,0,0.04)]"
              title="Add tags"
              onClick={() => setEditingTags((v) => !v)}
            >
              <Plus className="h-4 w-4" />
            </button>
            {editingTags ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-[520px] max-w-[90vw] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white p-3 shadow-lg">
                <div className="text-sm font-semibold text-[rgba(0,0,0,0.72)] mb-2">选择标签</div>
                {tagMessage ? <div className="text-xs text-green-600 mb-2">{tagMessage}</div> : null}
                {tagError ? <div className="text-xs text-red-600 mb-2">{tagError}</div> : null}
                <MultiTagSelect
                  options={tagOptions}
                  value={selectedTagIds}
                  onChange={setSelectedTagIds}
                  placeholder="选择标签"
                  maxChips={3}
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button onClick={() => setEditingTags(false)} disabled={savingTags}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={saveTags} disabled={savingTags}>
                    Save
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
   

        <div className="flex items-center gap-3  ml-auto">
        {/* <Button variant="primary" leftIcon={<Save className="w-4 h-4" />}>
          {JOB_DETAIL_TEXT.buttons.save}
        </Button> */}
        <Button leftIcon={<Archive className="w-4 h-4" />}>
          {JOB_DETAIL_TEXT.buttons.archive}
        </Button>
        <Button
          leftIcon={<Trash2 className="w-4 h-4" />}
          className="border-red-300 text-red-700 hover:bg-red-50"
          onClick={onDelete}
          disabled={isDeleting}
        >
          删除Job
        </Button>
        </div>
      </div>

  
      
    </div>
  );
}
