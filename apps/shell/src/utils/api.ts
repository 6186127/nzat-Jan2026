export type ApiResult<T> = {
  ok: boolean;
  data: T | null;
  status: number;
  error?: string;
};

export async function requestJson<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, options);
  let data: T | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = (data as { error?: string } | null)?.error || res.statusText || "Request failed";
    return { ok: false, data, status: res.status, error };
  }

  return { ok: true, data, status: res.status };
}
