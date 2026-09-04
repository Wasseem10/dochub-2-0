export function BrandWordmark({ className = "", logo = false }) {
  const classes = ["brand-wordmark", logo && "brand-wordmark--logo", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      {logo && <img className="brand-wordmark-logo" src="/pdfenrich-logo.png" alt="" />}
      <span className="brand-wordmark-name">PDF<span className="brand-wordmark-enrich">Enrich</span></span>
    </span>
  );
}
