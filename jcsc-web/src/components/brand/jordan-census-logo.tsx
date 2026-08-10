import { cn } from "@/lib/utils";

interface JordanCensusLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "light" | "dark" | "color" | "sidebar";
}

const sizes = { sm: 36, md: 48, lg: 64, xl: 80 };

/** شعار مركز دعم التعداد السكاني — تصميم عصري */
export function JordanCensusLogo({
  className,
  size = "md",
  showText = false,
  variant = "color",
}: JordanCensusLogoProps) {
  const px = sizes[size];
  const isLight = variant === "light";
  const isDark = variant === "dark";
  const isSidebar = variant === "sidebar";

  const gradId = `jcsc-grad-${size}-${variant}`;
  const glowId = `jcsc-glow-${size}-${variant}`;

  const gradStops = isSidebar
    ? ["#4338ca", "#4f46e5", "#6366f1"]
    : isLight
      ? ["#6ee7b7", "#34d399", "#22d3ee"]
      : ["#059669", "#0d9488", "#0891b2"];

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="relative shrink-0">
        {/* Glow ring */}
        {!isDark && (
          <div
            className={cn(
              "absolute inset-0 rounded-2xl blur-md opacity-60",
              isSidebar
                ? "bg-indigo-400/35"
                : isLight
                  ? "bg-emerald-400/30"
                  : "bg-emerald-500/25"
            )}
            style={{ transform: "scale(1.15)" }}
          />
        )}
        <svg
          width={px}
          height={px}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Jordan Census Support Center"
          role="img"
          className="relative drop-shadow-lg"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradStops[0]} />
              <stop offset="50%" stopColor={gradStops[1]} />
              <stop offset="100%" stopColor={gradStops[2]} />
            </linearGradient>
            <linearGradient id={glowId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isLight ? "#ffffff20" : "#ffffff15"} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <filter id={`shadow-${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Outer rounded square — modern app icon shape */}
          <rect
            x="4"
            y="4"
            width="72"
            height="72"
            rx="20"
            fill={
              isDark
                ? "#1e293b"
                : isSidebar || !isLight
                  ? `url(#${gradId})`
                  : "rgba(255,255,255,0.12)"
            }
            stroke={
              isSidebar
                ? "rgba(255,255,255,0.2)"
                : isLight
                  ? "rgba(255,255,255,0.25)"
                  : isDark
                    ? "#334155"
                    : "none"
            }
            strokeWidth="1.5"
            filter={isSidebar || (!isDark && !isLight) ? `url(#shadow-${gradId})` : undefined}
          />

          {/* Inner shine overlay */}
          {!isDark && (
            <rect x="4" y="4" width="72" height="36" rx="20" fill={`url(#${glowId})`} />
          )}

          {/* Jordan 7-point star — census hub */}
          <path
            d="M40 18 L42.8 28.5 L53.5 28.5 L45.1 34.8 L47.9 45.3 L40 39 L32.1 45.3 L34.9 34.8 L26.5 28.5 L37.2 28.5 Z"
            fill={
              isSidebar
                ? "white"
                : isLight
                  ? "#ecfdf5"
                  : isDark
                    ? `url(#${gradId})`
                    : "white"
            }
            opacity={isDark ? 1 : 0.95}
          />

          {/* Data pulse arcs — census analytics */}
          <path
            d="M20 58 Q40 52 60 58"
            stroke={
              isSidebar
                ? "rgba(255,255,255,0.75)"
                : isLight
                  ? "#6ee7b7"
                  : isDark
                    ? "#34d399"
                    : "rgba(255,255,255,0.6)"
            }
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle
            cx="24"
            cy="58"
            r="3"
            fill={isSidebar ? "#fde68a" : isLight ? "#34d399" : isDark ? "#10b981" : "white"}
          />
          <circle
            cx="40"
            cy="54"
            r="3.5"
            fill={isSidebar ? "#fbbf24" : isLight ? "#2dd4bf" : isDark ? "#14b8a6" : "white"}
          />
          <circle
            cx="56"
            cy="58"
            r="3"
            fill={isSidebar ? "#fb923c" : isLight ? "#22d3ee" : isDark ? "#06b6d4" : "white"}
          />

          {/* Connecting lines — network */}
          <line
            x1="24" y1="58" x2="40" y2="54"
            stroke={
              isSidebar
                ? "rgba(255,255,255,0.5)"
                : isLight
                  ? "#34d399"
                  : isDark
                    ? "#10b981"
                    : "rgba(255,255,255,0.4)"
            }
            strokeWidth="1.5"
          />
          <line
            x1="40" y1="54" x2="56" y2="58"
            stroke={
              isSidebar
                ? "rgba(255,255,255,0.5)"
                : isLight
                  ? "#22d3ee"
                  : isDark
                    ? "#06b6d4"
                    : "rgba(255,255,255,0.4)"
            }
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {showText && (
        <div className="min-w-0 leading-tight">
          <p
            className={cn(
              "truncate font-black tracking-tight",
              size === "xl" ? "text-xl" : size === "lg" ? "text-base" : "text-sm",
              isSidebar || isLight ? "text-white" : "text-foreground"
            )}
          >
            التعداد السكاني
          </p>
          <p
            className={cn(
              "truncate font-semibold mt-0.5",
              size === "xl" ? "text-sm" : "text-[11px]",
              isSidebar
                ? "text-white/70"
                : isLight
                  ? "text-emerald-200/80"
                  : "text-muted-foreground"
            )}
          >
            مركز دعم العمليات · JCSC
          </p>
        </div>
      )}
    </div>
  );
}
