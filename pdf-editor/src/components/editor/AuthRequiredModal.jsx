import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";

const actionContent = {
  save: {
    title: "Sync this PDF across devices",
    description: "Sign in and this PDF will sync automatically to your private account.",
    primary: "Sign in to sync",
    secondary: "Keep on this device",
  },
  share: {
    title: "Create a persistent sharing link",
    description: "Sign in to save this document securely before creating a persistent cloud link.",
    primary: "Sign in to continue",
    secondary: "Continue editing",
  },
  "signature-request": {
    title: "Create a secure signing request",
    description: "Sign in to store the source PDF securely and create a revocable link for the recipient.",
    primary: "Sign in to create request",
    secondary: "Continue editing",
  },
};

export function AuthRequiredModal({ action = "save", onClose, onSignIn }) {
  const content = actionContent[action] || actionContent.save;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-required-title">
      <section className="auth-required-modal">
        <header>
          <span className="auth-required-icon"><LockKeyhole size={23} /></span>
          <div>
            <h2 id="auth-required-title">{content.title}</h2>
            <p>{content.description}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close sign-in prompt"><X size={18} /></button>
        </header>
        <div className="auth-required-note">
          Your PDF and current edits stay in this browser until you sign in.
        </div>
        <footer>
          <button type="button" className="modal-secondary" onClick={onClose}>{content.secondary}</button>
          <button type="button" className="modal-primary" onClick={onSignIn}>{content.primary}</button>
        </footer>
      </section>
    </div>
  );
}
