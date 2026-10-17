import atlasIcon from '../assets/atlas_logo_icon.png'

/**
 * Atlas Brand Emblem & Minimalist Header
 * Features a crisp, high-contrast emblem and the clean brand name "Atlas".
 */
export function AtlasLogo({
  className = 'h-8 w-8',
  showText = false,
}) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className={`relative shrink-0 overflow-hidden rounded-xl border border-[#D5DDD5] bg-white shadow-xs ${className} flex items-center justify-center p-0.5 transition hover:scale-105`}>
        <img
          src={atlasIcon}
          alt="Atlas"
          className="h-full w-full object-contain"
          loading="eager"
        />
      </div>

      {showText && (
        <span className="text-lg font-bold tracking-tight text-[#262B27]">
          Atlas
        </span>
      )}
    </div>
  )
}
