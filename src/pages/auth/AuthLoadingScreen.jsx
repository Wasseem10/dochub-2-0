export function AuthLoadingScreen({ label = "Opening PDFEnrich" }) {
  return (
    <main className="auth-loading-shell" data-testid="auth-loading-screen">
      <section
        className="auth-loading-indicator"
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <span className="auth-loading-mark" aria-hidden="true">
          <img src="/icon.svg" alt="" width={30} height={30} />
        </span>
        <span className="auth-loading-progress" aria-hidden="true">
          <span />
        </span>
      </section>
    </main>
  );
}
