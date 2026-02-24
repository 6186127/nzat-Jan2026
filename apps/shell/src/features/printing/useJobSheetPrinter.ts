import { useCallback } from "react";
import {
  buildJobSheetHtml,
  type JobSheetRow,
  type JobSheetType,
} from "./jobSheetPrint";

type ResolveJobSheetData = (id: string) => Promise<{ row: JobSheetRow; notes: string } | null>;

type UseJobSheetPrinterOptions = {
  onPopupBlocked?: () => void;
  resolveById?: ResolveJobSheetData;
};

const PRINT_FRAME_ID = "job-sheet-print-frame";

export function useJobSheetPrinter(options: UseJobSheetPrinterOptions = {}) {
  const { onPopupBlocked, resolveById } = options;

  const print = useCallback(
    (type: JobSheetType, row: JobSheetRow, notes: string) => {
      if (!document.body) {
        onPopupBlocked?.();
        return;
      }

      const existing = document.getElementById(PRINT_FRAME_ID);
      if (existing) existing.remove();

      const iframe = document.createElement("iframe");
      iframe.id = PRINT_FRAME_ID;
      iframe.title = "Job Sheet Print Frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      iframe.style.pointerEvents = "none";

      iframe.onload = () => {
        const win = iframe.contentWindow;
        if (!win) return;
        const cleanup = () => {
          if (iframe.parentNode) iframe.remove();
        };
        try {
          win.addEventListener("afterprint", cleanup, { once: true });
          win.focus();
          win.print();
        } catch {
          cleanup();
          return;
        }

        window.setTimeout(cleanup, 15000);
      };

      const html = buildJobSheetHtml(type, row, notes);
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
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
