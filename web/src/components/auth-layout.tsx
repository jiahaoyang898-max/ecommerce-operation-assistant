import Link from "next/link";

/**
 * 认证页共用布局：左侧磨砂动态壁纸（电商运营数据场景，纯图形零文字），右侧玻璃表单区。
 * 视觉与 design-preview/auth-prototype.html 保持一致，仅在此处维护一份。
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-wall" aria-hidden="true">
          <span className="auth-blob auth-blob-1" />
          <span className="auth-blob auth-blob-2" />
          <span className="auth-blob auth-blob-3" />
          <span className="auth-blob auth-blob-4" />
          <span className="auth-sheen" />

          {/* 电商运营数据场景：成交柱状图 / 增长曲线 / 指标环 / 商品立方体 / 数据网格 */}
          <svg
            className="auth-scene"
            viewBox="0 0 800 940"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <defs>
              <linearGradient id="authBarFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ffffff" stopOpacity=".18" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity=".84" />
              </linearGradient>
              <linearGradient id="authTrendStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#48525f" stopOpacity=".14" />
                <stop offset="50%" stopColor="#48525f" stopOpacity=".52" />
                <stop offset="100%" stopColor="#047857" stopOpacity=".85" />
              </linearGradient>
              <pattern id="authDotGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="2.4" cy="2.4" r="1.1" fill="#414b5b" opacity=".175" />
              </pattern>
            </defs>

            {/* 数据网格 */}
            <rect className="auth-dots" x="0" y="0" width="800" height="940" fill="url(#authDotGrid)" />

            {/* 成交柱状图 */}
            <line x1="60" y1="866" x2="740" y2="866" stroke="#414b5b" strokeOpacity=".16" strokeWidth="1" />
            <g stroke="#414b5b" strokeOpacity=".20" strokeWidth="1">
              <rect className="auth-bar" x="133" y="780" width="30" height="86" rx="4" fill="url(#authBarFill)" />
              <rect className="auth-bar" x="189" y="738" width="30" height="128" rx="4" fill="url(#authBarFill)" />
              <rect className="auth-bar" x="245" y="766" width="30" height="100" rx="4" fill="url(#authBarFill)" />
              <rect className="auth-bar" x="301" y="702" width="30" height="164" rx="4" fill="url(#authBarFill)" />
              <rect className="auth-bar" x="357" y="730" width="30" height="136" rx="4" fill="url(#authBarFill)" />
              <rect className="auth-bar" x="413" y="674" width="30" height="192" rx="4" fill="url(#authBarFill)" />
              <rect className="auth-bar" x="469" y="718" width="30" height="148" rx="4" fill="url(#authBarFill)" />
              <rect className="auth-bar" x="525" y="656" width="30" height="210" rx="4" fill="url(#authBarFill)" />
              <rect className="auth-bar" x="581" y="696" width="30" height="170" rx="4" fill="url(#authBarFill)" />
              <rect className="auth-bar" x="637" y="750" width="30" height="116" rx="4" fill="url(#authBarFill)" />
            </g>

            {/* 趋势曲线：虚线对比基线 + 主增长线 + 数据点 + 沿路径移动的绿色光点 */}
            <path
              d="M 112 650 C 208 627, 262 556, 350 535 S 495 460, 572 405 C 630 370, 662 348, 690 332"
              stroke="#48525f"
              strokeOpacity=".18"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="7 9"
            />
            <path
              id="authTrend"
              className="auth-curve"
              pathLength="100"
              d="M 112 700 C 208 677, 262 600, 350 578 S 495 492, 572 436 C 630 397, 662 374, 690 358"
              stroke="url(#authTrendStroke)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <g fill="#ffffff" stroke="#48525f" strokeOpacity=".38" strokeWidth="1.4">
              <circle cx="350" cy="578" r="3.4" />
              <circle cx="572" cy="436" r="3.4" />
            </g>
            <circle r="3.6" fill="#047857">
              <animateMotion dur="10.5s" repeatCount="indefinite">
                <mpath href="#authTrend" />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0;.9;.9;0"
                keyTimes="0;.16;.78;1"
                dur="10.5s"
                repeatCount="indefinite"
              />
            </circle>

            {/* 指标环 */}
            <g>
              <circle
                cx="400"
                cy="370"
                r="128"
                stroke="#414b5b"
                strokeOpacity=".20"
                strokeWidth="7.5"
                pathLength="144"
                strokeDasharray="1.2 10.8"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 400 370"
                  to="-360 400 370"
                  dur="72s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="400" cy="370" r="106" stroke="#414b5b" strokeOpacity=".13" strokeWidth="1.6" />
              <circle
                cx="400"
                cy="370"
                r="106"
                stroke="#047857"
                strokeOpacity=".62"
                strokeWidth="2.8"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray="64 100"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="-90 400 370"
                  to="270 400 370"
                  dur="16s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="400" cy="370" r="76" stroke="#414b5b" strokeOpacity=".10" strokeWidth="1.2" />
              <circle cx="400" cy="370" r="4.5" fill="#047857" opacity=".45" />
            </g>

            {/* 商品 / 包裹立方体 */}
            <g transform="translate(148,182) scale(1.2)">
              <g className="auth-cube">
                <path
                  d="M 0,-26 L 20,-16 L 0,-6 L -20,-16 Z"
                  fill="#ffffff"
                  fillOpacity=".88"
                  stroke="#414b5b"
                  strokeOpacity=".30"
                  strokeWidth=".9"
                  strokeLinejoin="round"
                />
                <path
                  d="M 20,-16 L 0,-6 L 0,16 L 20,6 Z"
                  fill="#ffffff"
                  fillOpacity=".60"
                  stroke="#414b5b"
                  strokeOpacity=".30"
                  strokeWidth=".9"
                  strokeLinejoin="round"
                />
                <path
                  d="M -20,-16 L 0,-6 L 0,16 L -20,6 Z"
                  fill="#ffffff"
                  fillOpacity=".38"
                  stroke="#414b5b"
                  strokeOpacity=".30"
                  strokeWidth=".9"
                  strokeLinejoin="round"
                />
                <line x1="-20" y1="-16" x2="20" y2="-16" stroke="#047857" strokeOpacity=".34" strokeWidth="1.1" />
              </g>
            </g>

            <g transform="translate(660,154) scale(.85)">
              <g className="auth-cube auth-cube-b">
                <path
                  d="M 0,-26 L 20,-16 L 0,-6 L -20,-16 Z"
                  fill="#ffffff"
                  fillOpacity=".92"
                  stroke="#047857"
                  strokeOpacity=".40"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path
                  d="M 20,-16 L 0,-6 L 0,16 L 20,6 Z"
                  fill="#047857"
                  fillOpacity=".16"
                  stroke="#047857"
                  strokeOpacity=".40"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path
                  d="M -20,-16 L 0,-6 L 0,16 L -20,6 Z"
                  fill="#047857"
                  fillOpacity=".09"
                  stroke="#047857"
                  strokeOpacity=".40"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </g>
            </g>

            <g transform="translate(348,182) scale(.6)">
              <g className="auth-cube auth-cube-c">
                <path
                  d="M 0,-26 L 20,-16 L 0,-6 L -20,-16 Z"
                  fill="#ffffff"
                  fillOpacity=".86"
                  stroke="#414b5b"
                  strokeOpacity=".28"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path
                  d="M 20,-16 L 0,-6 L 0,16 L 20,6 Z"
                  fill="#ffffff"
                  fillOpacity=".56"
                  stroke="#414b5b"
                  strokeOpacity=".28"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path
                  d="M -20,-16 L 0,-6 L 0,16 L -20,6 Z"
                  fill="#ffffff"
                  fillOpacity=".34"
                  stroke="#414b5b"
                  strokeOpacity=".28"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </g>
            </g>
          </svg>

          <span className="auth-grain" />
          <span className="auth-vignette" />
        </div>

        <Link href="/" className="auth-logo">
          <span className="auth-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
                stroke="#ffffff"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M12 12v9M12 12l8-4.5M12 12 4 7.5" stroke="#ffffff" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="auth-word">
            电商运营助手
            <i>ECOMMERCE OPS</i>
          </span>
        </Link>
      </aside>

      <main className="auth-panel">{children}</main>
    </div>
  );
}
