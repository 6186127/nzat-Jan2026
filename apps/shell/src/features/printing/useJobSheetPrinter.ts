import { useCallback } from "react";
import {
  buildJobSheetHtml,
  openJobSheetPopup,
  renderJobSheetPopup,
  type JobSheetRow,
  type JobSheetType,
} from "./jobSheetPrint";

type ResolveJobSheetData = (id: string) => Promise<{ row: JobSheetRow; notes: string } | null>;

type UseJobSheetPrinterOptions = {
  onPopupBlocked?: () => void;
  resolveById?: ResolveJobSheetData;
};

export function useJobSheetPrinter(options: UseJobSheetPrinterOptions = {}) {
  const { onPopupBlocked, resolveById } = options;

  const print = useCallback(
    (type: JobSheetType, row: JobSheetRow, notes: string) => {
      const popup = openJobSheetPopup(onPopupBlocked);
      if (!popup) return;
      const html = buildJobSheetHtml(type, row, notes);
      renderJobSheetPopup(popup, html);
    },
    [onPopupBlocked]
  );

  const printById = useCallback(
    async (id: string, type: JobSheetType) => {
      if (!resolveById) {
        return;
      }
      const resolved = await resolveById(id);
      if (!resolved) return;
      print(type, resolved.row, resolved.notes);
    },
    [resolveById, print]
  );

  return { print, printById };
}
