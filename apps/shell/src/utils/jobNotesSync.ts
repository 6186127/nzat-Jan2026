export const JOB_NOTES_SYNC_EVENT = "job-notes-updated";
export const JOB_NOTES_SYNC_STORAGE_KEY = "job-notes-updated";

export type JobNotesSyncPayload = {
  jobId: string;
  notes: string;
  updatedAt: number;
};

export const emitJobNotesSync = (payload: JobNotesSyncPayload) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<JobNotesSyncPayload>(JOB_NOTES_SYNC_EVENT, { detail: payload }));
  try {
    window.localStorage.setItem(JOB_NOTES_SYNC_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors (private mode / quota / disabled storage).
  }
};

export const parseJobNotesSyncPayload = (value: string | null) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<JobNotesSyncPayload> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.jobId !== "string" || typeof parsed.notes !== "string") return null;
    return {
      jobId: parsed.jobId,
      notes: parsed.notes,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
};
