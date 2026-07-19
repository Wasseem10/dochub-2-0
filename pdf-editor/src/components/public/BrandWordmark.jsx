export function BrandWordmark({ className = "" }) {
  return (
    <span className={`brand-wordmark ${className}`.trim()} aria-hidden="true">
      <span className="brand-wordmark-name">FixThat</span>
      <span className="brand-wordmark-pdf">PDF</span>
    </span>
  );
}
