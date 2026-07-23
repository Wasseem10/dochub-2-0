function PdfArrowLogo() {
  return (
    <svg className="brand-wordmark-logo" viewBox="0 0 244 54" focusable="false">
      <defs>
        <linearGradient id="pdfarrow-blue" x1="4" y1="4" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1785ff" />
          <stop offset="1" stopColor="#1745dc" />
        </linearGradient>
      </defs>
      <path d="M12 3h25l13 13v29a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6Z" fill="url(#pdfarrow-blue)" />
      <path d="M37 3v10a4 4 0 0 0 4 4h9L37 3Z" fill="#9ec5ff" />
      <path d="m15 25 10 10-5 5 2 2 16-16-16-16-2 2 5 5-10 10h-8v8h8Z" fill="#fff" transform="translate(1 1) scale(.77)" />
      <path d="M2 39h12M0 45h17" stroke="#1745dc" strokeLinecap="round" strokeWidth="3.5" />
      <text x="62" y="37" fill="#10172a" fontFamily="DM Sans, Arial, sans-serif" fontSize="31" fontWeight="800" letterSpacing="-1.8">pdfarrow</text>
    </svg>
  );
}

export function BrandWordmark({ className = "", logo = false }) {
  const classes = ["brand-wordmark", logo && "brand-wordmark--logo", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      {logo ? (
        <PdfArrowLogo />
      ) : (
        <span className="brand-wordmark-name">PDF<span className="brand-wordmark-arrow">Arrow</span></span>
      )}
    </span>
  );
}
