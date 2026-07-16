import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";

const actionContent = {
  save: {
    title: "Save this document to your account",
    description: "Sign in to save this document to your account and access it later.",
    primary: "Sign in to save",
    secondary: "Continue without saving",
  },
  share: {
    title: "Create a persistent sharing link",
    description: "Sign in to save this document securely before creating a persistent cloud link.",
    primary: "Sign in to continue",
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
          Your PDF and current edits stay in this browser unless you choose to sign in.
        </div>
        <footer>
          <button type="button" className="modal-secondary" onClick={onClose}>{content.secondary}</button>
          <button type="button" className="modal-primary" onClick={onSignIn}>{content.primary}</button>
        </footer>
      </section>
    </div>
  );
}
