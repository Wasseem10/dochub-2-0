import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.jsx";
import "./account-deletion.css";

export function AccountDeletionCard() {
  const { currentUser, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  if (!currentUser) return null;
  const usesPassword = currentUser.providers?.includes("password");
  const remove = async () => {
    setStatus("working");
    setError("");
    const result = await deleteAccount({ password });
    if (!result.ok) {
      setStatus("idle");
      setError(result.error);
      return;
    }
    window.location.assign("/");
  };
  return <>
    <article className="account-delete-card"><span><AlertTriangle size={21} /></span><div><strong>Delete account and cloud data</strong><p>Permanently remove your login, saved cloud documents, account-linked analytics, and account-linked support requests.</p></div><button type="button" onClick={() => setOpen(true)}><Trash2 size={16} /> Delete account</button></article>
    {open && <div className="account-delete-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-account-title"><section><header><div><span>Permanent action</span><h2 id="delete-account-title">Delete your PDFArrow account?</h2></div><button type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button></header><p>This removes the Firebase account, saved cloud document records and payloads, account-linked analytics, and support requests submitted while signed in. Download anything you need first. This cannot be undone.</p>{usesPassword ? <label><span>Current password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label> : <div className="account-google-note">Google will ask you to confirm this account again.</div>}<label className="account-delete-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I understand this permanently deletes my account and cloud data.</span></label>{error && <div className="account-delete-error" role="alert">{error}</div>}<footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="is-danger" type="button" disabled={!confirmed || status === "working" || (usesPassword && !password)} onClick={remove}>{status === "working" ? <><LoaderCircle className="is-spinning" size={16} /> Deleting…</> : <><Trash2 size={16} /> Permanently delete</>}</button></footer></section></div>}
  </>;
}
