import { PUBLIC_API_URL } from "$env/static/public";
import { getCookie } from "./api";

export async function downloadBlob(endpoint: string, filename: string) {
  const accessToken = getCookie("access_token");
  const res = await fetch(`${PUBLIC_API_URL}${endpoint}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (!res.ok) throw new Error(`Download gagal (${res.status})`);

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
