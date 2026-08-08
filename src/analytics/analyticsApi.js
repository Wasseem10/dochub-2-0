import { getToken as getAppCheckToken } from "firebase/app-check";
import { appCheck, auth } from "../firebase.js";

const DEFAULT_ANALYTICS_API_BASE_URL = "https://us-central1-pdf-editor-1137a.cloudfunctions.net/analyticsApi";
const API_BASE_URL = String(import.meta.env.VITE_ANALYTICS_API_BASE_URL || DEFAULT_ANALYTICS_API_BASE_URL).replace(/\/+$/, "");

async function ownerHeaders() {
  const user = auth?.currentUser;
  if (!user) throw new Error("analytics_authentication_required");
  const headers = { Authorization: `Bearer ${await user.getIdToken()}` };
  if (appCheck) {
    const result = await getAppCheckToken(appCheck, false);
    if (result?.token) headers["X-Firebase-AppCheck"] = result.token;
  }
  return headers;
}

export async function loadAdminAnalytics({ start, end, includeInternal = false, signal } = {}) {
  const search = new URLSearchParams();
  if (start) search.set("start", start);
  if (end) search.set("end", end);
  if (includeInternal) search.set("includeInternal", "true");
  const response = await fetch(`${API_BASE_URL}/v1/admin/events?${search.toString()}`, {
    headers: await ownerHeaders(),
    cache: "no-store",
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    const error = new Error(payload?.error?.message || "Private analytics could not be loaded.");
    error.code = payload?.error?.code || "analytics_request_failed";
    error.status = response.status;
    throw error;
  }
  return payload;
}
