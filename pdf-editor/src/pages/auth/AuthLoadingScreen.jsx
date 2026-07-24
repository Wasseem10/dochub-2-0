import { BrandWordmark } from "../../components/public/BrandWordmark.jsx";

export function AuthLoadingScreen({ label = "Opening PDFArrow" }) {
  return (
    <main className="auth-loading-shell">
      <section className="auth-loading-card" role="status" aria-live="polite" aria-label={label}>
        <div className="auth-loading-brand" aria-hidden="true">
          <BrandWordmark />
        </div>

        <div className="auth-loading-copy">
          <h1>Opening your workspace</h1>
          <p>Restoring your saved session and documents.</p>
        </div>

        <div className="auth-loading-progress" aria-hidden="true"><span /></div>

        <p className="auth-loading-status">
          <span aria-hidden="true" />
          Checking your saved sign-in
        </p>
      </section>
    </main>
  );
}
