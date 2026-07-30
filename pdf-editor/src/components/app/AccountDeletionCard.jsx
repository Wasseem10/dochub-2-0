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
  const usesLocalProfile = currentUser.providers?.includes("local");

  const close = () => {
    if (status === "working") return;
    setOpen(false);
    setConfirmed(false);
    setPassword("");
    setError("");
  };

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

  return (
    <>
      <article className="account-delete-card">
        <span><AlertTriangle size={21} /></span>
        <div>
          <strong>{usesLocalProfile ? "Delete local browser profile" : "Delete account and private cloud data"}</strong>
          <p>{usesLocalProfile
            ? "Remove this device-local profile and its browser-stored documents, sessions, and signatures."
            : "The server must confirm removal of every owned PDF version and related record before the login is deleted."}</p>
        </div>
        <button type="button" onClick={() => setOpen(true)}><Trash2 size={16} /> Delete account</button>
      </article>
      {open && (
        <div className="account-delete-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <section>
            <header>
              <div><span>Permanent action</span><h2 id="delete-account-title">Delete your PDFEnrich account?</h2></div>
              <button type="button" aria-label="Close" disabled={status === "working"} onClick={close}><X size={18} /></button>
            </header>
            {usesLocalProfile ? <p>
              This profile exists only in this browser and is not a Firebase-authenticated account. Deletion removes
              its local document catalog, editor recovery sessions, and saved signatures from this browser.
            </p> : <p>
              This deletes every active private PDF version, sharing record, account-linked analytics and support
              record, local editor session, and saved signature, then the Firebase login. If server deletion cannot
              be confirmed, PDFEnrich stops instead of partially deleting the account. Provider backups or soft-delete
              generations can remain until the verified production retention period ends. If your browser blocks
              local cleanup, clear PDFEnrich site data from the browser after deletion.
            </p>}
            {usesPassword ? (
              <label>
                <span>Current password</span>
                <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
            ) : !usesLocalProfile ? (
              <div className="account-google-note">Google will ask you to confirm this account again.</div>
            ) : null}
            <label className="account-delete-check">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>{usesLocalProfile
                ? "I understand this permanently deletes this browser-local profile and its local work."
                : "I understand this permanently deletes my account and active private cloud data."}</span>
            </label>
            {error && <div className="account-delete-error" role="alert">{error}</div>}
            <footer>
              <button type="button" disabled={status === "working"} onClick={close}>Cancel</button>
              <button
                className="is-danger"
                type="button"
                disabled={!confirmed || status === "working" || (usesPassword && !password)}
                onClick={remove}
              >
                {status === "working"
                  ? <><LoaderCircle className="is-spinning" size={16} /> Deleting…</>
                  : <><Trash2 size={16} /> Permanently delete</>}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
