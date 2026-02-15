import { motion, AnimatePresence } from "framer-motion";

interface SaladBowlProps {
  digitCount: number;
}

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 18,
};

function Ingredient({
  visible,
  id,
  children,
  delay = 0,
}: {
  visible: boolean;
  id: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.g
          key={id}
          initial={{ opacity: 0, y: -30, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.2 }}
          transition={{ ...springIn, delay }}
        >
          {children}
        </motion.g>
      )}
    </AnimatePresence>
  );
}

export default function SaladBowl({ digitCount }: SaladBowlProps) {
  return (
    <div className="flex justify-center w-full">
      <svg
        viewBox="0 0 300 210"
        className="w-64 h-44 sm:w-72 sm:h-48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Bowl body gradient - 3D depth */}
          <linearGradient id="bowlBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8f4ec" />
            <stop offset="50%" stopColor="#ede4d4" />
            <stop offset="100%" stopColor="#d8ccb4" />
          </linearGradient>
          {/* Bowl rim gradient */}
          <linearGradient id="bowlRim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fefcf8" />
            <stop offset="50%" stopColor="#f5ede0" />
            <stop offset="100%" stopColor="#e8dcc8" />
          </linearGradient>
          {/* Bowl interior shadow */}
          <radialGradient id="bowlInner" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#f5f0e5" />
            <stop offset="70%" stopColor="#e8dece" />
            <stop offset="100%" stopColor="#d5c8b0" />
          </radialGradient>
          {/* Bowl highlight */}
          <linearGradient id="bowlHighlight" x1="0.3" y1="0" x2="0.7" y2="0.5">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {/* Drop shadow filter */}
          <filter id="bowlShadow" x="-10%" y="-5%" width="120%" height="130%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#8a8070" floodOpacity="0.3" />
          </filter>

          {/* Green lettuce gradients */}
          <radialGradient id="lettuce1" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#d4e88a" />
            <stop offset="40%" stopColor="#a8cc3e" />
            <stop offset="100%" stopColor="#558b2f" />
          </radialGradient>
          <radialGradient id="lettuce2" cx="50%" cy="30%">
            <stop offset="0%" stopColor="#b9f06b" />
            <stop offset="50%" stopColor="#8bc34a" />
            <stop offset="100%" stopColor="#33691e" />
          </radialGradient>
          <radialGradient id="lettuce3" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#c6e74e" />
            <stop offset="60%" stopColor="#9ccc65" />
            <stop offset="100%" stopColor="#689f38" />
          </radialGradient>

          {/* Radicchio / purple leaf */}
          <radialGradient id="radicchio1" cx="40%" cy="30%">
            <stop offset="0%" stopColor="#b85070" />
            <stop offset="50%" stopColor="#8e244d" />
            <stop offset="100%" stopColor="#3a0d1e" />
          </radialGradient>
          <radialGradient id="radicchio2" cx="50%" cy="35%">
            <stop offset="0%" stopColor="#c4607a" />
            <stop offset="50%" stopColor="#963254" />
            <stop offset="100%" stopColor="#4a1228" />
          </radialGradient>

          {/* Onion */}
          <radialGradient id="onionOuter" cx="45%" cy="40%">
            <stop offset="0%" stopColor="#e8a0c0" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#c06090" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#7b2254" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="onionMid" cx="50%" cy="45%">
            <stop offset="0%" stopColor="#f0c0d8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#d890b0" stopOpacity="0.3" />
          </radialGradient>

          {/* Salmon */}
          <linearGradient id="salmon1" x1="0" y1="0" x2="1" y2="0.5">
            <stop offset="0%" stopColor="#ffab91" />
            <stop offset="40%" stopColor="#ff7043" />
            <stop offset="100%" stopColor="#e64a19" />
          </linearGradient>
          <linearGradient id="salmon2" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#ffccbc" />
            <stop offset="50%" stopColor="#ff8a65" />
            <stop offset="100%" stopColor="#e64a19" />
          </linearGradient>

          {/* Caper */}
          <radialGradient id="caper" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#689f38" />
            <stop offset="60%" stopColor="#3e7422" />
            <stop offset="100%" stopColor="#265015" />
          </radialGradient>

          {/* Dressing */}
          <linearGradient id="dressing" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fffde7" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#fff9c4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fffde7" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* ========== 3D BOWL ========== */}
        {/* Shadow under bowl */}
        <ellipse cx="150" cy="185" rx="90" ry="12" fill="#b5ad9e" opacity="0.3" />

        {/* Bowl body - curved 3D shape */}
        <path
          d="M42 95 Q45 175 150 178 Q255 175 258 95 Z"
          fill="url(#bowlBody)"
          filter="url(#bowlShadow)"
        />

        {/* Bowl front face highlight */}
        <path
          d="M60 105 Q63 165 150 168 Q237 165 240 105 Z"
          fill="url(#bowlHighlight)"
          opacity="0.4"
        />

        {/* Bowl rim - thick 3D ellipse */}
        <ellipse cx="150" cy="95" rx="112" ry="28" fill="url(#bowlRim)" stroke="#cfc2aa" strokeWidth="1.2" />

        {/* Rim top highlight */}
        <ellipse cx="150" cy="93" rx="106" ry="23" fill="none" stroke="#faf7f0" strokeWidth="1.5" opacity="0.6" />

        {/* Inner bowl surface */}
        <ellipse cx="150" cy="98" rx="98" ry="21" fill="url(#bowlInner)" />

        {/* ========== GREEN BED - many small overlapping leaves fill the bowl ========== */}
        <Ingredient visible={digitCount >= 1} id="greenBed">
          {/* Back row of small leaves - near rim edges */}
          <path d="M68 102 Q62 92 72 86 Q82 82 88 90 Q84 98 74 100Z" fill="#558b2f" opacity="0.8" />
          <path d="M88 98 Q84 88 95 82 Q106 80 110 88 Q106 96 95 98Z" fill="#7cb342" opacity="0.85" />
          <path d="M108 96 Q106 86 115 80 Q126 78 130 86 Q126 94 116 96Z" fill="#689f38" opacity="0.8" />
          <path d="M128 94 Q126 84 136 78 Q148 76 152 84 Q148 92 138 94Z" fill="#8bc34a" opacity="0.82" />
          <path d="M148 93 Q147 83 156 78 Q168 76 172 84 Q168 92 158 94Z" fill="#6a9e30" opacity="0.85" />
          <path d="M168 94 Q166 84 176 79 Q188 77 192 86 Q188 94 178 95Z" fill="#7cb342" opacity="0.8" />
          <path d="M188 96 Q186 86 196 81 Q208 80 212 88 Q208 96 198 98Z" fill="#558b2f" opacity="0.82" />
          <path d="M208 98 Q206 90 215 85 Q225 84 228 92 Q224 100 215 100Z" fill="#689f38" opacity="0.78" />

          {/* Middle row - slightly forward */}
          <path d="M75 108 Q68 98 78 92 Q90 88 96 96 Q92 104 82 106Z" fill="#8bc34a" opacity="0.82" />
          <path d="M96 105 Q90 95 100 90 Q112 86 118 94 Q114 102 104 104Z" fill="#6a9e30" opacity="0.85" />
          <path d="M116 103 Q112 93 122 88 Q134 85 138 92 Q134 100 124 102Z" fill="#7cb342" opacity="0.83" />
          <path d="M136 102 Q132 92 142 87 Q154 84 158 92 Q154 100 144 101Z" fill="#558b2f" opacity="0.8" />
          <path d="M155 101 Q152 91 162 86 Q174 84 178 92 Q174 100 164 101Z" fill="#8bc34a" opacity="0.84" />
          <path d="M175 102 Q172 92 182 87 Q194 85 198 93 Q194 101 184 102Z" fill="#689f38" opacity="0.82" />
          <path d="M195 104 Q192 94 202 89 Q212 88 216 95 Q212 103 203 104Z" fill="#7cb342" opacity="0.8" />
          <path d="M215 106 Q212 97 220 93 Q228 92 230 98 Q226 106 220 106Z" fill="#6a9e30" opacity="0.75" />

          {/* Front row - closest to viewer, slight overlap with rim */}
          <path d="M82 114 Q76 104 86 98 Q96 95 100 102 Q96 110 88 112Z" fill="#689f38" opacity="0.78" />
          <path d="M100 112 Q96 102 106 97 Q118 94 122 102 Q118 110 108 112Z" fill="#7cb342" opacity="0.8" />
          <path d="M120 111 Q116 101 126 96 Q138 94 142 101 Q138 109 128 111Z" fill="#558b2f" opacity="0.76" />
          <path d="M140 110 Q136 100 146 96 Q158 94 162 100 Q158 108 148 110Z" fill="#8bc34a" opacity="0.78" />
          <path d="M158 110 Q156 100 165 96 Q176 94 180 100 Q176 108 166 110Z" fill="#6a9e30" opacity="0.8" />
          <path d="M178 111 Q175 102 184 97 Q194 95 198 102 Q194 110 186 112Z" fill="#7cb342" opacity="0.76" />
          <path d="M198 112 Q195 104 203 99 Q212 98 215 104 Q212 112 204 113Z" fill="#558b2f" opacity="0.74" />

          {/* Scattered tiny accent leaves for texture */}
          <path d="M110 100 Q108 94 114 92 Q120 91 122 96 Q118 100 112 100Z" fill="#9ccc65" opacity="0.5" />
          <path d="M160 98 Q158 92 164 90 Q170 89 172 94 Q168 98 162 98Z" fill="#9ccc65" opacity="0.45" />
          <path d="M85 104 Q83 98 88 96 Q94 95 96 100 Q92 104 87 104Z" fill="#aed581" opacity="0.4" />
          <path d="M200 100 Q198 94 204 92 Q210 92 212 96 Q208 100 202 100Z" fill="#aed581" opacity="0.45" />
        </Ingredient>

        {/* ========== LAYER 1: BASE GREENS (1-3) - individual leaves on top ========== */}

        {/* Digit 1: Big lettuce leaf - left half, extends to bowl edge */}
        <Ingredient visible={digitCount >= 1} id="leaf1">
          <path
            d="M58 108 Q50 90 60 78 Q72 65 92 72 Q108 60 125 68
               Q138 60 152 70 Q160 80 152 95 Q142 108 125 112 Q100 116 78 110 Q65 112 58 108 Z"
            fill="url(#lettuce1)" opacity="0.92"
          />
          <path d="M90 106 Q100 88 115 74" stroke="#558b2f" strokeWidth="0.7" fill="none" opacity="0.3" />
          <path d="M78 102 Q88 85 98 74" stroke="#558b2f" strokeWidth="0.5" fill="none" opacity="0.2" />
          <path d="M110 104 Q120 88 132 76" stroke="#558b2f" strokeWidth="0.5" fill="none" opacity="0.2" />
        </Ingredient>

        {/* Digit 2: Radicchio - right half, extends to bowl edge */}
        <Ingredient visible={digitCount >= 2} id="radi1" delay={0.06}>
          <path
            d="M185 112 Q205 108 228 95 Q242 82 238 70 Q230 60 215 66
               Q202 56 188 62 Q175 58 168 70 Q162 82 170 98 Q176 110 185 112 Z"
            fill="url(#radicchio1)" opacity="0.9"
          />
          <path d="M195 106 Q208 90 225 75" stroke="#e8c0d0" strokeWidth="0.8" fill="none" opacity="0.4" />
          <path d="M188 100 Q198 84 205 72" stroke="#e8c0d0" strokeWidth="0.5" fill="none" opacity="0.3" />
          <path d="M200 102 Q195 86 185 72" stroke="#e8c0d0" strokeWidth="0.5" fill="none" opacity="0.25" />
        </Ingredient>

        {/* Digit 3: Center green leaf overlapping both */}
        <Ingredient visible={digitCount >= 3} id="leaf2" delay={0.06}>
          <path
            d="M110 108 Q95 95 100 78 Q108 62 130 65 Q148 55 165 64
               Q178 58 188 70 Q195 82 185 96 Q172 108 155 110 Q135 114 110 108 Z"
            fill="url(#lettuce3)" opacity="0.88"
          />
          <path d="M142 106 Q145 85 152 68" stroke="#689f38" strokeWidth="0.6" fill="none" opacity="0.3" />
          <path d="M125 100 Q132 82 138 70" stroke="#689f38" strokeWidth="0.5" fill="none" opacity="0.2" />
          <path d="M162 100 Q165 85 170 72" stroke="#689f38" strokeWidth="0.5" fill="none" opacity="0.2" />
        </Ingredient>

        {/* ========== LAYER 2: ONION + MORE LEAVES (4-6) ========== */}

        {/* Digit 4: Red onion ring - left-center, large */}
        <Ingredient visible={digitCount >= 4} id="onion1">
          <ellipse cx="118" cy="94" rx="24" ry="15" fill="none" stroke="url(#onionOuter)" strokeWidth="5.5" transform="rotate(-10 118 94)" />
          <ellipse cx="118" cy="94" rx="17" ry="10" fill="none" stroke="url(#onionMid)" strokeWidth="3" transform="rotate(-10 118 94)" />
          <ellipse cx="118" cy="94" rx="11" ry="6.5" fill="none" stroke="#f8e0ec" strokeWidth="1.8" opacity="0.45" transform="rotate(-10 118 94)" />
        </Ingredient>

        {/* Digit 5: Another radicchio leaf - left, larger */}
        <Ingredient visible={digitCount >= 5} id="radi2" delay={0.06}>
          <path
            d="M68 105 Q55 92 60 76 Q68 64 85 68 Q98 58 112 66
               Q120 60 124 72 Q128 84 118 98 Q105 108 88 106 Q75 108 68 105 Z"
            fill="url(#radicchio2)" opacity="0.85"
          />
          <path d="M85 102 Q84 85 90 70" stroke="#e0b0c0" strokeWidth="0.6" fill="none" opacity="0.35" />
          <path d="M98 98 Q100 82 108 70" stroke="#e0b0c0" strokeWidth="0.5" fill="none" opacity="0.25" />
        </Ingredient>

        {/* Digit 6: Second onion arc - right, larger */}
        <Ingredient visible={digitCount >= 6} id="onion2" delay={0.06}>
          <path d="M172 102 Q190 85 206 72 Q215 60 220 68" fill="none" stroke="url(#onionOuter)" strokeWidth="5" strokeLinecap="round" />
          <path d="M176 100 Q192 84 208 72 Q215 64 218 70" fill="none" stroke="url(#onionMid)" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M179 98 Q194 84 208 74" fill="none" stroke="#f8e0ec" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        </Ingredient>

        {/* ========== LAYER 3: SALMON RIBBONS + CAPERS (7-9) ========== */}

        {/* Digit 7: Large curled salmon ribbon - center-left */}
        <Ingredient visible={digitCount >= 7} id="salm1">
          <path
            d="M92 95 Q80 78 95 64 Q110 52 130 58 Q148 48 160 60
               Q168 70 158 84 Q145 94 130 90 Q115 94 105 90 Q96 94 92 95 Z"
            fill="url(#salmon1)" opacity="0.92"
          />
          <path d="M102 88 Q112 72 128 62 Q142 54 155 62" stroke="#ffccbc" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.55" />
          <path d="M98 90 Q108 76 118 66" stroke="#d84315" strokeWidth="0.6" fill="none" opacity="0.25" />
        </Ingredient>

        {/* Digit 8: Second salmon piece - center-right */}
        <Ingredient visible={digitCount >= 8} id="salm2" delay={0.06}>
          <path
            d="M152 90 Q164 74 180 64 Q195 55 205 64
               Q212 75 200 86 Q188 94 176 90 Q164 94 152 90 Z"
            fill="url(#salmon2)" opacity="0.88"
          />
          <path d="M160 86 Q172 72 190 62" stroke="#ffccbc" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M164 88 Q174 76 184 66" stroke="#bf360c" strokeWidth="0.5" fill="none" opacity="0.2" />
        </Ingredient>

        {/* Digit 9: Capers scattered across bowl */}
        <Ingredient visible={digitCount >= 9} id="capers" delay={0.06}>
          <circle cx="78" cy="98" r="3.8" fill="url(#caper)" />
          <circle cx="77" cy="96.2" r="1.2" fill="#8bc34a" opacity="0.5" />

          <circle cx="222" cy="92" r="3.2" fill="url(#caper)" />
          <circle cx="221" cy="90.5" r="1" fill="#8bc34a" opacity="0.5" />

          <circle cx="145" cy="102" r="3.5" fill="url(#caper)" />
          <circle cx="144" cy="100.2" r="1.1" fill="#8bc34a" opacity="0.5" />

          <circle cx="185" cy="98" r="3" fill="url(#caper)" />
          <circle cx="184" cy="96.5" r="0.9" fill="#8bc34a" opacity="0.45" />

          <circle cx="108" cy="104" r="2.8" fill="url(#caper)" />
          <circle cx="107" cy="102.5" r="0.8" fill="#8bc34a" opacity="0.45" />
        </Ingredient>

        {/* ========== LAYER 4: DRESSING + SPARKLES (10) ========== */}
        <Ingredient visible={digitCount >= 10} id="finish">
          {/* Dressing drizzle - spans bowl */}
          <path d="M70 88 Q105 70 145 80 Q185 66 230 82" stroke="url(#dressing)" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.75" />
          <path d="M85 80 Q120 62 155 72 Q190 58 220 75" stroke="#fffde7" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
          <circle cx="75" cy="86" r="2.2" fill="#fffde7" opacity="0.6" />
          <circle cx="225" cy="80" r="1.8" fill="#fff9c4" opacity="0.5" />

          {/* Sparkles */}
          <motion.circle cx="55" cy="58" r="2.5" fill="#fff9c4"
            animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.circle cx="245" cy="55" r="2" fill="#fff9c4"
            animate={{ opacity: [0.2, 0.85, 0.2], scale: [0.7, 1.25, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
          />
          <motion.circle cx="150" cy="42" r="2.2" fill="#fffde7"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.15, 0.9] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.7 }}
          />
        </Ingredient>
      </svg>
    </div>
  );
}
