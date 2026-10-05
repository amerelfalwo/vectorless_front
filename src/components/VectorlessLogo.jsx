/**
 * Vectorless RAG custom brand logo representing hierarchical document trees & AI indexing
 */
export function VectorlessLogo({ className = 'h-6 w-6' }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="v_brand_grad_1" x1="2" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="v_brand_grad_2" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <path
        d="M16 3L28 9.5V22.5L16 29L4 22.5V9.5L16 3Z"
        stroke="url(#v_brand_grad_1)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="#171717"
      />
      <circle cx="16" cy="11" r="2.5" fill="#10b981" />
      <circle cx="10" cy="20" r="2" fill="#06b6d4" />
      <circle cx="22" cy="20" r="2" fill="#8b5cf6" />
      <line x1="16" y1="13.5" x2="10" y2="18" stroke="url(#v_brand_grad_2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="13.5" x2="22" y2="18" stroke="url(#v_brand_grad_2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="20" x2="22" y2="20" stroke="url(#v_brand_grad_2)" strokeWidth="1.2" strokeDasharray="2 2" strokeOpacity="0.5" />
    </svg>
  )
}
