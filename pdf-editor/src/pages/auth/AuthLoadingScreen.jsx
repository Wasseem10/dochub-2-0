export function AuthLoadingScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-label="Restoring session">
        <span className="route-status-pill">RealPDF</span>
        <h2>Opening workspace</h2>
        <p className="auth-intro">Your document workspace is almost ready.</p>
        <p className="auth-privacy">Checking your saved sign-in before loading the app.</p>
      </section>
    </main>
  );
}
