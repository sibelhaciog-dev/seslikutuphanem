import type { AvatarCharacter } from '@/lib/avatar'
import { getCharacter } from '@/lib/avatar'

interface AvatarFigureProps {
  characterId: string
  accessories?: readonly string[]
  /** Sadece baş görünümü — küçük listelerde kullanılır. */
  headOnly?: boolean
  size?: number
  className?: string
  title?: string
}

function Head({ character }: { character: AvatarCharacter }) {
  const { skin, hair, feminine } = character
  return (
    <>
      <ellipse cx="80" cy="62" rx="36" ry="40" fill={skin} />
      <ellipse cx="44" cy="64" rx="9" ry="11" fill={skin} />
      <ellipse cx="116" cy="64" rx="9" ry="11" fill={skin} />
      {feminine ? (
        <>
          <ellipse cx="80" cy="30" rx="36" ry="18" fill={hair} />
          <rect x="44" y="28" width="13" height="44" rx="7" fill={hair} />
          <rect x="103" y="28" width="13" height="44" rx="7" fill={hair} />
          <ellipse cx="50" cy="76" rx="9" ry="18" fill={hair} />
          <ellipse cx="110" cy="76" rx="9" ry="18" fill={hair} />
        </>
      ) : (
        <>
          <ellipse cx="80" cy="28" rx="35" ry="16" fill={hair} />
          <rect x="44" y="28" width="72" height="18" rx="4" fill={hair} />
        </>
      )}
      <ellipse cx="66" cy="62" rx="8" ry="9" fill="#fff" />
      <ellipse cx="94" cy="62" rx="8" ry="9" fill="#fff" />
      <circle cx="67" cy="63" r="5" fill="#3a2a1a" />
      <circle cx="95" cy="63" r="5" fill="#3a2a1a" />
      <circle cx="69" cy="61" r="2" fill="#fff" />
      <circle cx="97" cy="61" r="2" fill="#fff" />
      <path
        d="M68 78 Q80 88 92 78"
        fill="none"
        stroke="#c0725a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="55" cy="72" rx="9" ry="6" fill="#ffaaaa" opacity="0.4" />
      <ellipse cx="105" cy="72" rx="9" ry="6" fill="#ffaaaa" opacity="0.4" />
    </>
  )
}

export function AvatarFigure({
  characterId,
  accessories = [],
  headOnly = false,
  size = 160,
  className,
  title,
}: AvatarFigureProps) {
  const character = getCharacter(characterId)
  const { skin, feminine } = character
  const shirt = feminine ? '#E86CC2' : '#378ADD'
  const trousers = feminine ? '#9B59B6' : '#2C3E50'
  const has = (id: string) => accessories.includes(id)

  if (headOnly) {
    return (
      <svg
        viewBox="40 12 80 96"
        width={size}
        height={size}
        className={className}
        role={title ? 'img' : 'presentation'}
        aria-label={title}
      >
        <Head character={character} />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 160 260"
      width={size}
      height={(size / 160) * 260}
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
    >
      {/* Arka katman aksesuarları */}
      {has('s6') && (
        <g opacity="0.65">
          <path d="M10 210 Q80 110 150 210" fill="none" stroke="#E74C3C" strokeWidth="9" />
          <path d="M18 210 Q80 122 142 210" fill="none" stroke="#E67E22" strokeWidth="7" />
          <path d="M26 210 Q80 134 134 210" fill="none" stroke="#F1C40F" strokeWidth="7" />
          <path d="M34 210 Q80 146 126 210" fill="none" stroke="#2ECC71" strokeWidth="6" />
          <path d="M42 210 Q80 158 118 210" fill="none" stroke="#3498DB" strokeWidth="5" />
        </g>
      )}
      {has('s8') && (
        <path
          d="M40 100 Q20 140 28 190 L80 178 L132 190 Q140 140 120 100Z"
          fill="#764ba2"
          opacity="0.82"
        />
      )}

      {/* Bacaklar ve ayakkabılar */}
      <rect x="56" y="175" width="20" height="65" rx="9" fill={trousers} />
      <rect x="84" y="175" width="20" height="65" rx="9" fill={trousers} />
      <ellipse cx="66" cy="240" rx="15" ry="8" fill="#2C3E50" />
      <ellipse cx="94" cy="240" rx="15" ry="8" fill="#2C3E50" />

      {/* Gövde ve kollar */}
      <rect x="42" y="100" width="76" height="80" rx="14" fill={shirt} />
      <rect x="18" y="102" width="26" height="58" rx="12" fill={shirt} />
      <rect x="116" y="102" width="26" height="58" rx="12" fill={shirt} />
      <ellipse cx="31" cy="160" rx="12" ry="13" fill={skin} />
      <ellipse cx="129" cy="160" rx="12" ry="13" fill={skin} />

      {has('s9') && (
        <text x="8" y="170" fontSize="26" transform="rotate(-25,22,158)">
          🚀
        </text>
      )}
      {has('s12') && (
        <text x="114" y="170" fontSize="26">
          🔮
        </text>
      )}

      <rect x="68" y="86" width="24" height="18" rx="7" fill={skin} />
      <Head character={character} />

      {has('s4') && (
        <g fill="#E86CC2">
          <path d="M42 118 Q18 92 40 80 Q55 98 80 108Z" opacity="0.82" />
          <path d="M118 118 Q142 92 120 80 Q105 98 80 108Z" opacity="0.82" />
          <path d="M42 118 Q22 136 44 148 Q58 128 80 118Z" opacity="0.68" />
          <path d="M118 118 Q138 136 116 148 Q102 128 80 118Z" opacity="0.68" />
        </g>
      )}
      {has('s10') && (
        <g fill="#27ae60">
          <ellipse cx="128" cy="95" rx="20" ry="13" />
          <circle cx="134" cy="84" r="9" />
          <circle cx="136" cy="82" r="2.5" fill="#fff" />
          <path d="M116 88 L104 81 L112 93Z" />
        </g>
      )}

      {has('s1') && (
        <g>
          <polygon points="52,28 64,10 80,22 96,10 108,28" fill="#FFD700" />
          <circle cx="64" cy="12" r="5" fill="#FF6B6B" />
          <circle cx="80" cy="24" r="5" fill="#FF6B6B" />
          <circle cx="96" cy="12" r="5" fill="#FF6B6B" />
        </g>
      )}
      {has('s2') && !has('s1') && (
        <g>
          <ellipse cx="80" cy="24" rx="40" ry="9" fill="#333" />
          <rect x="53" y="0" width="54" height="26" rx="7" fill="#222" />
          <rect x="58" y="22" width="44" height="6" rx="3" fill="#555" />
        </g>
      )}
      {has('s5') && (
        <g>
          <circle cx="112" cy="34" r="9" fill="#FF88AA" opacity="0.9" />
          <circle cx="120" cy="26" r="7" fill="#FF88AA" opacity="0.9" />
          <circle cx="120" cy="42" r="7" fill="#FF88AA" opacity="0.9" />
          <circle cx="116" cy="34" r="6" fill="#FFE566" />
        </g>
      )}
      {has('s7') && (
        <g fill="#E86CC2">
          <path d="M55 22 Q67 16 80 22 Q67 28 55 22Z" />
          <path d="M105 22 Q93 16 80 22 Q93 28 105 22Z" />
          <circle cx="80" cy="22" r="6" />
          <circle cx="80" cy="22" r="3" fill="#fff" />
        </g>
      )}
      {has('s3') && (
        <text x="112" y="54" fontSize="26">
          ⭐
        </text>
      )}
      {has('s11') && (
        <text x="112" y="120" fontSize="26">
          ⚡
        </text>
      )}
    </svg>
  )
}
