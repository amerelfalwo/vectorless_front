import atlasIcon from '../assets/atlas_logo_icon.png'
import { PRODUCT_CONFIG } from '../config/product.js'

/**
 * Atlas Brand Emblem & Identity
 * Visual motif: Compass rose, hierarchical tree branches, and open document folio forming an 'A'.
 */
export function AtlasLogo({
  className = 'h-7 w-7',
  showText = false,
  showTagline = false,
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`relative shrink-0 overflow-hidden rounded-lg border border-[#E4E5DE] bg-white p-0.5 shadow-2xs ${className} flex items-center justify-center`}>
        <img
          src={atlasIcon}
          alt="Atlas Logo"
          className="h-full w-full object-contain"
          loading="eager"
        />
      </div>

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
