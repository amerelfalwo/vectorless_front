import { PRODUCT_CONFIG } from '../config/product.js'

/**
 * Atlas Brand Emblem & Identity
 * Visual motif: Layered architectural document planes forming an 'A'
 * with a tree root/branch discovery node in forest green (#285943) and sage (#8DAA91).
 */
export function AtlasLogo({
  className = 'h-6 w-6',
  showText = false,
  showTagline = false,
}) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Soft rounded container for the emblem */}
        <rect width="32" height="32" rx="7" fill="#285943" />
        
        {/* Geometric 'A' forming an architectural arch & open folio */}
        <path
          d="M16 6.5L8.5 24H12.2L14 19.5H18L19.8 24H23.5L16 6.5Z"
          fill="#F7F6F1"
        />
        <path
          d="M14.8 16.8H17.2L16 13.2L14.8 16.8Z"
          fill="#285943"
        />
        
        {/* Hierarchical knowledge node indicator (Muted Sage) */}
        <circle cx="16" cy="10" r="1.6" fill="#8DAA91" />
        
        {/* Subtle base baseline supporting knowledge structure */}
        <line
          x1="11"
          y1="25.5"
          x2="21"
          y2="25.5"
          stroke="#8DAA91"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-base font-semibold tracking-tight text-[#262B27]">
              {PRODUCT_CONFIG.name}
            </span>
            <span className="text-[10px] font-medium tracking-wide text-[#777D76] uppercase">
              {PRODUCT_CONFIG.category}
            </span>
          </div>
          {showTagline && (
            <span className="text-[11px] text-[#777D76]">
              {PRODUCT_CONFIG.tagline}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
