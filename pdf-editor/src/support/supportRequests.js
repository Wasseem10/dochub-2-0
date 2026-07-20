import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase.js";

const CATEGORIES = new Set(["product_help", "bug", "account", "privacy", "security", "other"]);

export function validateSupportRequest(request) {
  const name = request.name?.trim() || "";
  const email = request.email?.trim().toLowerCase() || "";
  const category = request.category || "product_help";
  const message = request.message?.trim() || "";
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Enter your name (2–80 characters)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) return { ok: false, error: "Enter a valid email address." };
  if (!CATEGORIES.has(category)) return { ok: false, error: "Choose a support category." };
  if (message.length < 10 || message.length > 4000) return { ok: false, error: "Describe the issue in 10–4,000 characters." };
  return { ok: true, value: { name, email, category, message } };
}

export async function submitSupportRequest(request) {
  const validated = validateSupportRequest(request);
  if (!validated.ok) return validated;
  if (!db) return { ok: false, error: "Support storage is not configured. Please try again later." };
  try {
    await addDoc(collection(db, "supportRequests"), {
      ...validated.value,
      status: "new",
      actorId: auth?.currentUser?.uid || null,
      createdAt: serverTimestamp(),
      clientCreatedAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Your request could not be sent. Please try again in a moment." };
  }
}
