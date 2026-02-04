import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { JOB_DETAIL_TEXT } from "@/features/jobDetail/jobDetail.constants";
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";

type WofToolbarProps = {
  isLoading?: boolean;
  onRefresh?: () => Promise<{ success: boolean; message?: string }>;
  onDelete?: () => Promise<{ success: boolean; message?: string }>;
};

export function WofToolbar({ isLoading, onRefresh, onDelete }: WofToolbarProps) {
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!deleteMessage) return;
    const timer = window.setTimeout(() => setDeleteMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [deleteMessage]);

  useEffect(() => {
    if (!deleteError) return;
    const timer = window.setTimeout(() => setDeleteError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [deleteError]);

  useEffect(() => {
    if (!refreshMessage) return;
    const timer = window.setTimeout(() => setRefreshMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [refreshMessage]);

  useEffect(() => {
    if (!refreshError) return;
    const timer = window.setTimeout(() => setRefreshError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [refreshError]);

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm("确定删除该 WOF 记录及相关数据？")) return;
    setDeleteMessage(null);
    setDeleteError(null);
    const response = await onDelete();
    if (response.success) {
      setDeleteMessage(response.message || "删除成功");
    } else {
      setDeleteError(response.message || "删除失败");
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshMessage(null);
    setRefreshError(null);
    setRefreshing(true);
    try {
      const response = await onRefresh();
      if (response.success) {
        setRefreshMessage(response.message || "导入成功");
      } else {
        setRefreshError(response.message || "导入失败");
      }
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      {deleteMessage ? <div className="text-xs text-green-600">{deleteMessage}</div> : null}
      {deleteError ? <div className="text-xs text-red-600">{deleteError}</div> : null}
      {refreshMessage ? <div className="text-xs text-green-600">{refreshMessage}</div> : null}
      {refreshError ? <div className="text-xs text-red-600">{refreshError}</div> : null}
      <Button className="flex items-center gap-2" onClick={handleRefresh} disabled={isLoading || refreshing}>
        <RefreshCw className="w-4 h-4" />
        {JOB_DETAIL_TEXT.buttons.refresh}
      </Button>
      <Button className="flex items-center gap-2">
        <ExternalLink className="w-4 h-4" />
        {JOB_DETAIL_TEXT.buttons.openNzta}
      </Button>
      <Button
        leftIcon={<Trash2 className="w-4 h-4" />}
        className="border-red-300 text-red-700 hover:bg-red-50"
        onClick={handleDelete}
        disabled={isLoading}
      >
        删除WOF
      </Button>
    </div>
  );
}
