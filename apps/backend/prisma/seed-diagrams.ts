import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

/**
 * Generates vector-rendered .webp diagram images directly into the
 * local upload storage directory for offline self-hosted CBT demonstration.
 */
export async function ensureSeedDiagrams(outputDir: string): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const diagrams: { filename: string; width: number; height: number; svg: string }[] = [
    // 1. Math Geometry: Right triangle with hypotenuse r=10cm, theta=30 deg
    {
      filename: 'stimulus-math-geometry.webp',
      width: 640,
      height: 380,
      svg: `
      <svg width="640" height="380" viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="380" fill="#0F172A" rx="16"/>
        <!-- Grid pattern -->
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1E293B" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="640" height="380" fill="url(#grid)"/>

        <!-- Triangle ABC -->
        <polygon points="120,300 480,300 480,92" fill="#4F46E5" fill-opacity="0.12" stroke="#6366F1" stroke-width="3.5" stroke-linejoin="round"/>

        <!-- Right angle marker at B (480,300) -->
        <path d="M 456 300 L 456 276 L 480 276" fill="none" stroke="#A5B4FC" stroke-width="2.5"/>

        <!-- Angle theta arc at A (120,300) -->
        <path d="M 180 300 A 60 60 0 0 0 172 270" fill="none" stroke="#F59E0B" stroke-width="3"/>
        <text x="195" y="285" fill="#FBBF24" font-family="sans-serif" font-size="18" font-weight="bold">θ = 30°</text>

        <!-- Vertex labels -->
        <text x="95" y="315" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="bold">A</text>
        <text x="495" y="315" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="bold">B</text>
        <text x="495" y="95" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="bold">C</text>

        <!-- Sides labels -->
        <text x="260" y="180" fill="#38BDF8" font-family="sans-serif" font-size="19" font-weight="bold" transform="rotate(-30 260 180)">r = 10 cm</text>
        <text x="290" y="330" fill="#E2E8F0" font-family="sans-serif" font-size="17" font-weight="600">x (alas)</text>
        <text x="510" y="205" fill="#E2E8F0" font-family="sans-serif" font-size="17" font-weight="600">y (tinggi)</text>

        <!-- Title Pill -->
        <rect x="20" y="20" width="220" height="34" rx="8" fill="#1E293B" stroke="#334155"/>
        <text x="32" y="43" fill="#94A3B8" font-family="sans-serif" font-size="13" font-weight="600">📐 Geometri &amp; Trigonometri</text>
      </svg>`,
    },

    // 2. Math Quadratic Curve: y = -x^2 + 4x + 5 with vertex (2, 9)
    {
      filename: 'stimulus-math-parabola.webp',
      width: 640,
      height: 400,
      svg: `
      <svg width="640" height="400" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="400" fill="#0F172A" rx="16"/>
        <!-- Axes -->
        <line x1="80" y1="320" x2="580" y2="320" stroke="#475569" stroke-width="2.5"/>
        <line x1="220" y1="40" x2="220" y2="360" stroke="#475569" stroke-width="2.5"/>
        <!-- Arrows -->
        <polygon points="585,320 575,315 575,325" fill="#475569"/>
        <polygon points="220,35 215,45 225,45" fill="#475569"/>
        <text x="585" y="340" fill="#94A3B8" font-family="sans-serif" font-size="16" font-weight="bold">x</text>
        <text x="200" y="45" fill="#94A3B8" font-family="sans-serif" font-size="16" font-weight="bold">y</text>

        <!-- Parabola Curve y = -(x-2)^2 + 9 -->
        <!-- Center (220, 320) as (0,0); scale: 30px per unit. Vertex at (2,9) => (220 + 60 = 280, 320 - 270 = 50) -->
        <path d="M 130 350 Q 280 -80 430 350" fill="none" stroke="#10B981" stroke-width="4"/>

        <!-- Vertex Point (2, 9) -->
        <circle cx="280" cy="80" r="6" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2"/>
        <text x="295" y="80" fill="#FCD34D" font-family="sans-serif" font-size="16" font-weight="bold">Puncak (2, 9)</text>

        <!-- Intercept points -->
        <circle cx="220" cy="170" r="5" fill="#38BDF8"/>
        <text x="175" y="175" fill="#38BDF8" font-family="sans-serif" font-size="14">(0, 5)</text>

        <circle cx="190" cy="320" r="5" fill="#E2E8F0"/>
        <text x="175" y="345" fill="#94A3B8" font-family="sans-serif" font-size="14">-1</text>

        <circle cx="370" cy="320" r="5" fill="#E2E8F0"/>
        <text x="365" y="345" fill="#94A3B8" font-family="sans-serif" font-size="14">5</text>

        <!-- Function label -->
        <rect x="360" y="120" width="190" height="34" rx="8" fill="#1E293B" stroke="#10B981"/>
        <text x="375" y="142" fill="#34D399" font-family="sans-serif" font-size="14" font-weight="bold">f(x) = -x² + 4x + 5</text>
      </svg>`,
    },

    // 3. Physics Circuit: V=24V, R1=4 ohm, R2=6 ohm, R3=12 ohm
    {
      filename: 'stimulus-physics-circuit.webp',
      width: 640,
      height: 360,
      svg: `
      <svg width="640" height="360" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="360" fill="#0F172A" rx="16"/>

        <!-- Circuit Wire Path -->
        <path d="M 120 180 L 120 80 L 260 80" fill="none" stroke="#E2E8F0" stroke-width="3.5"/>
        <path d="M 330 80 L 400 80 L 400 130" fill="none" stroke="#E2E8F0" stroke-width="3.5"/>
        <path d="M 400 80 L 400 30 L 450 30" fill="none" stroke="#E2E8F0" stroke-width="3.5"/>
        <path d="M 400 130 L 450 130" fill="none" stroke="#E2E8F0" stroke-width="3.5"/>
        <path d="M 520 30 L 560 30 L 560 80" fill="none" stroke="#E2E8F0" stroke-width="3.5"/>
        <path d="M 520 130 L 560 130 L 560 80" fill="none" stroke="#E2E8F0" stroke-width="3.5"/>
        <path d="M 560 80 L 580 80 L 580 280 L 120 280 L 120 200" fill="none" stroke="#E2E8F0" stroke-width="3.5"/>

        <!-- DC Voltage Source V = 24V (120, 190) -->
        <line x1="100" y1="185" x2="140" y2="185" stroke="#38BDF8" stroke-width="5"/>
        <line x1="110" y1="195" x2="130" y2="195" stroke="#38BDF8" stroke-width="3"/>
        <text x="50" y="193" fill="#38BDF8" font-family="sans-serif" font-size="17" font-weight="bold">V = 24 V</text>
        <text x="145" y="180" fill="#EF4444" font-family="sans-serif" font-size="15" font-weight="bold">+</text>
        <text x="145" y="205" fill="#38BDF8" font-family="sans-serif" font-size="17" font-weight="bold">-</text>

        <!-- Current Arrow I -->
        <path d="M 180 75 L 200 80 L 180 85 Z" fill="#F59E0B"/>
        <text x="185" y="65" fill="#FBBF24" font-family="sans-serif" font-size="15" font-weight="bold">I</text>

        <!-- Resistor R1 (Series) -->
        <rect x="260" y="68" width="70" height="24" rx="4" fill="#334155" stroke="#818CF8" stroke-width="2"/>
        <text x="272" y="85" fill="#FFFFFF" font-family="sans-serif" font-size="14" font-weight="bold">R₁ = 4 Ω</text>

        <!-- Resistor R2 (Parallel Upper) -->
        <rect x="450" y="18" width="70" height="24" rx="4" fill="#334155" stroke="#F472B6" stroke-width="2"/>
        <text x="462" y="35" fill="#FFFFFF" font-family="sans-serif" font-size="14" font-weight="bold">R₂ = 6 Ω</text>

        <!-- Resistor R3 (Parallel Lower) -->
        <rect x="450" y="118" width="70" height="24" rx="4" fill="#334155" stroke="#34D399" stroke-width="2"/>
        <text x="458" y="135" fill="#FFFFFF" font-family="sans-serif" font-size="14" font-weight="bold">R₃ = 12 Ω</text>

        <!-- Junction dots -->
        <circle cx="400" cy="80" r="5" fill="#F59E0B"/>
        <circle cx="560" cy="80" r="5" fill="#F59E0B"/>

        <!-- Header -->
        <rect x="20" y="20" width="230" height="32" rx="8" fill="#1E293B" stroke="#334155"/>
        <text x="32" y="42" fill="#94A3B8" font-family="sans-serif" font-size="13" font-weight="600">⚡ Rangkaian Listrik Campuran</text>
      </svg>`,
    },

    // 4. Physics v-t Kinematics Graph
    {
      filename: 'stimulus-physics-vt-graph.webp',
      width: 640,
      height: 380,
      svg: `
      <svg width="640" height="380" viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="380" fill="#0F172A" rx="16"/>

        <!-- Grid Lines -->
        <line x1="100" y1="200" x2="560" y2="200" stroke="#1E293B" stroke-width="1.5" stroke-dasharray="4"/>
        <line x1="100" y1="120" x2="560" y2="120" stroke="#1E293B" stroke-width="1.5" stroke-dasharray="4"/>
        <line x1="220" y1="60" x2="220" y2="300" stroke="#1E293B" stroke-width="1.5" stroke-dasharray="4"/>
        <line x1="420" y1="60" x2="420" y2="300" stroke="#1E293B" stroke-width="1.5" stroke-dasharray="4"/>

        <!-- Axes -->
        <line x1="100" y1="300" x2="580" y2="300" stroke="#64748B" stroke-width="2.5"/>
        <line x1="100" y1="60" x2="100" y2="320" stroke="#64748B" stroke-width="2.5"/>
        <text x="590" y="305" fill="#94A3B8" font-family="sans-serif" font-size="15" font-weight="bold">t (sekon)</text>
        <text x="60" y="65" fill="#94A3B8" font-family="sans-serif" font-size="15" font-weight="bold">v (m/s)</text>

        <!-- Velocity curve with shaded area under curve -->
        <!-- (100, 300) t=0,v=0 -> (220, 120) t=3,v=20 -> (420, 120) t=7,v=20 -> (540, 300) t=10,v=0 -->
        <polygon points="100,300 220,120 420,120 540,300" fill="#38BDF8" fill-opacity="0.15"/>
        <polyline points="100,300 220,120 420,120 540,300" fill="none" stroke="#0284C7" stroke-width="4"/>

        <!-- Points & Ticks -->
        <circle cx="220" cy="120" r="5" fill="#38BDF8"/>
        <circle cx="420" cy="120" r="5" fill="#38BDF8"/>
        <text x="65" y="125" fill="#E2E8F0" font-family="sans-serif" font-size="14" font-weight="bold">20</text>
        <text x="65" y="305" fill="#E2E8F0" font-family="sans-serif" font-size="14" font-weight="bold">0</text>
        <text x="215" y="325" fill="#E2E8F0" font-family="sans-serif" font-size="14" font-weight="bold">3</text>
        <text x="415" y="325" fill="#E2E8F0" font-family="sans-serif" font-size="14" font-weight="bold">7</text>
        <text x="532" y="325" fill="#E2E8F0" font-family="sans-serif" font-size="14" font-weight="bold">10</text>

        <!-- Annotations -->
        <text x="290" y="105" fill="#38BDF8" font-family="sans-serif" font-size="14" font-weight="bold">v = tetap (GLB)</text>
        <text x="290" y="220" fill="#F59E0B" font-family="sans-serif" font-size="15" font-weight="bold">Luas = Jarak Tempuh (s)</text>
      </svg>`,
    },

    // 5. Chemistry Voltaic Cell (Zn - Cu)
    {
      filename: 'stimulus-chemistry-volta.webp',
      width: 640,
      height: 400,
      svg: `
      <svg width="640" height="400" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="400" fill="#0F172A" rx="16"/>

        <!-- Left Beaker (Anode Zn) -->
        <rect x="90" y="180" width="160" height="170" rx="8" fill="#1E293B" stroke="#64748B" stroke-width="2.5"/>
        <rect x="95" y="220" width="150" height="125" rx="4" fill="#38BDF8" fill-opacity="0.15"/>
        <rect x="150" y="130" width="30" height="170" rx="4" fill="#94A3B8" stroke="#E2E8F0" stroke-width="2"/>
        <text x="145" y="115" fill="#CBD5E1" font-family="sans-serif" font-size="15" font-weight="bold">Zn (Anoda)</text>
        <text x="110" y="320" fill="#38BDF8" font-family="sans-serif" font-size="13">Larutan ZnSO₄</text>

        <!-- Right Beaker (Cathode Cu) -->
        <rect x="390" y="180" width="160" height="170" rx="8" fill="#1E293B" stroke="#64748B" stroke-width="2.5"/>
        <rect x="395" y="220" width="150" height="125" rx="4" fill="#F97316" fill-opacity="0.15"/>
        <rect x="455" y="130" width="30" height="170" rx="4" fill="#EA580C" stroke="#FDBA74" stroke-width="2"/>
        <text x="445" y="115" fill="#FB923C" font-family="sans-serif" font-size="15" font-weight="bold">Cu (Katoda)</text>
        <text x="410" y="320" fill="#FB923C" font-family="sans-serif" font-size="13">Larutan CuSO₄</text>

        <!-- Salt Bridge (Jembatan Garam) -->
        <path d="M 210 260 L 210 160 L 430 160 L 430 260" fill="none" stroke="#FACC15" stroke-width="16" stroke-linecap="round"/>
        <path d="M 210 260 L 210 160 L 430 160 L 430 260" fill="none" stroke="#1E293B" stroke-width="8" stroke-linecap="round"/>
        <text x="270" y="145" fill="#FACC15" font-family="sans-serif" font-size="14" font-weight="bold">Jembatan Garam (KNO₃)</text>

        <!-- Voltmeter & Wires -->
        <path d="M 165 130 L 165 60 L 290 60" fill="none" stroke="#EF4444" stroke-width="3"/>
        <path d="M 470 130 L 470 60 L 350 60" fill="none" stroke="#22C55E" stroke-width="3"/>
        <circle cx="320" cy="60" r="30" fill="#1E293B" stroke="#60A5FA" stroke-width="3"/>
        <text x="312" y="67" fill="#60A5FA" font-family="sans-serif" font-size="18" font-weight="bold">V</text>
        <text x="280" y="25" fill="#38BDF8" font-family="sans-serif" font-size="13" font-weight="bold">E° sel = +1,10 V</text>
      </svg>`,
    },

    // 6. Biology Plant Cell
    {
      filename: 'stimulus-biology-cell.webp',
      width: 640,
      height: 400,
      svg: `
      <svg width="640" height="400" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="400" fill="#0F172A" rx="16"/>

        <!-- Outer Plant Cell Wall (Hexagon/Polygon) -->
        <polygon points="120,60 520,60 580,200 520,340 120,340 60,200" fill="#064E3B" stroke="#10B981" stroke-width="12" stroke-linejoin="round"/>
        <polygon points="125,70 515,70 570,200 515,330 125,330 70,200" fill="#065F46" stroke="#34D399" stroke-width="4" stroke-linejoin="round"/>

        <!-- Large Central Vacuole -->
        <ellipse cx="260" cy="210" rx="110" ry="80" fill="#0284C7" fill-opacity="0.3" stroke="#38BDF8" stroke-width="2"/>
        <text x="230" y="215" fill="#BAE6FD" font-family="sans-serif" font-size="14">Vakuola</text>

        <!-- Nucleus (Inti Sel) -->
        <circle cx="440" cy="160" r="45" fill="#7C3AED" fill-opacity="0.6" stroke="#A78BFA" stroke-width="3"/>
        <circle cx="440" cy="160" r="18" fill="#5B21B6"/>
        <text x="420" y="165" fill="#EDE9FE" font-family="sans-serif" font-size="13" font-weight="bold">Nukleus</text>

        <!-- Chloroplast (Organelle 2) -->
        <ellipse cx="180" cy="120" rx="35" ry="20" fill="#15803D" stroke="#4ADE80" stroke-width="2.5" transform="rotate(-20 180 120)"/>
        <!-- Mitochondria (Organelle 3) -->
        <ellipse cx="440" cy="270" rx="32" ry="18" fill="#B91C1C" stroke="#F87171" stroke-width="2.5" transform="rotate(15 440 270)"/>

        <!-- Callouts / Pointers -->
        <!-- Pointer 1: Cell Wall -->
        <line x1="60" y1="90" x2="115" y2="65" stroke="#F59E0B" stroke-width="2.5"/>
        <circle cx="60" cy="90" r="14" fill="#F59E0B"/>
        <text x="56" y="95" fill="#000" font-family="sans-serif" font-size="14" font-weight="bold">1</text>

        <!-- Pointer 2: Chloroplast -->
        <line x1="260" y1="80" x2="195" y2="115" stroke="#F59E0B" stroke-width="2.5"/>
        <circle cx="260" cy="80" r="14" fill="#F59E0B"/>
        <text x="256" y="85" fill="#000" font-family="sans-serif" font-size="14" font-weight="bold">2</text>

        <!-- Pointer 3: Mitochondria -->
        <line x1="530" y1="280" x2="475" y2="270" stroke="#F59E0B" stroke-width="2.5"/>
        <circle cx="530" cy="280" r="14" fill="#F59E0B"/>
        <text x="526" y="285" fill="#000" font-family="sans-serif" font-size="14" font-weight="bold">3</text>
      </svg>`,
    },

    // 7. Economics Supply and Demand Curve
    {
      filename: 'stimulus-economics-curve.webp',
      width: 640,
      height: 380,
      svg: `
      <svg width="640" height="380" viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="380" fill="#0F172A" rx="16"/>

        <!-- Axes -->
        <line x1="100" y1="320" x2="560" y2="320" stroke="#64748B" stroke-width="2.5"/>
        <line x1="100" y1="40" x2="100" y2="320" stroke="#64748B" stroke-width="2.5"/>
        <text x="570" y="325" fill="#94A3B8" font-family="sans-serif" font-size="15" font-weight="bold">Q (Kuantitas)</text>
        <text x="50" y="45" fill="#94A3B8" font-family="sans-serif" font-size="15" font-weight="bold">P (Harga)</text>

        <!-- Demand Curve D -->
        <line x1="140" y1="80" x2="500" y2="280" stroke="#EF4444" stroke-width="3.5"/>
        <text x="510" y="285" fill="#EF4444" font-family="sans-serif" font-size="16" font-weight="bold">D</text>

        <!-- Initial Supply S0 -->
        <line x1="160" y1="280" x2="480" y2="80" stroke="#3B82F6" stroke-width="3.5"/>
        <text x="490" y="85" fill="#3B82F6" font-family="sans-serif" font-size="16" font-weight="bold">S₀</text>

        <!-- Shifted Supply S1 (Shift Left/Upwards due to cost increase) -->
        <line x1="120" y1="240" x2="440" y2="40" stroke="#F59E0B" stroke-width="3.5" stroke-dasharray="6"/>
        <text x="450" y="45" fill="#F59E0B" font-family="sans-serif" font-size="16" font-weight="bold">S₁</text>

        <!-- Equilibrium Points -->
        <!-- E0 (320, 180) -->
        <circle cx="320" cy="180" r="6" fill="#3B82F6"/>
        <text x="330" y="195" fill="#93C5FD" font-family="sans-serif" font-size="14" font-weight="bold">E₀ (P₀, Q₀)</text>
        <!-- E1 (280, 158) -->
        <circle cx="280" cy="158" r="6" fill="#F59E0B"/>
        <text x="220" y="150" fill="#FCD34D" font-family="sans-serif" font-size="14" font-weight="bold">E₁ (P₁, Q₁)</text>

        <!-- Shift Arrow -->
        <path d="M 390 135 L 360 115" stroke="#F59E0B" stroke-width="3" fill="none" marker-end="url(#arrow)"/>
        <text x="390" y="115" fill="#FCD34D" font-family="sans-serif" font-size="13">Biaya Naik ⇧</text>
      </svg>`,
    },

    // 8. Option A: Parabola opening upward with vertex (1, -4) -> CORRECT for f(x) = x^2 - 2x - 3
    {
      filename: 'opt-parabola-a.webp',
      width: 360,
      height: 240,
      svg: `
      <svg width="360" height="240" viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="240" fill="#1E293B" rx="10"/>
        <line x1="40" y1="120" x2="320" y2="120" stroke="#64748B" stroke-width="1.5"/>
        <line x1="160" y1="20" x2="160" y2="220" stroke="#64748B" stroke-width="1.5"/>
        <!-- Parabola opens UP, vertex at (180, 180) => (1, -4) -->
        <path d="M 90 50 Q 185 240 280 50" fill="none" stroke="#10B981" stroke-width="3"/>
        <circle cx="185" cy="175" r="4" fill="#F59E0B"/>
        <text x="20" y="30" fill="#38BDF8" font-family="sans-serif" font-size="14" font-weight="bold">Pilihan A</text>
      </svg>`,
    },

    // 9. Option B: Parabola opening downward with vertex (1, 4)
    {
      filename: 'opt-parabola-b.webp',
      width: 360,
      height: 240,
      svg: `
      <svg width="360" height="240" viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="240" fill="#1E293B" rx="10"/>
        <line x1="40" y1="120" x2="320" y2="120" stroke="#64748B" stroke-width="1.5"/>
        <line x1="160" y1="20" x2="160" y2="220" stroke="#64748B" stroke-width="1.5"/>
        <!-- Parabola opens DOWN -->
        <path d="M 90 200 Q 185 10 280 200" fill="none" stroke="#EF4444" stroke-width="3"/>
        <circle cx="185" cy="65" r="4" fill="#F59E0B"/>
        <text x="20" y="30" fill="#94A3B8" font-family="sans-serif" font-size="14" font-weight="bold">Pilihan B</text>
      </svg>`,
    },

    // 10. Option C: Parabola opening upward with vertex (-1, -4)
    {
      filename: 'opt-parabola-c.webp',
      width: 360,
      height: 240,
      svg: `
      <svg width="360" height="240" viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="240" fill="#1E293B" rx="10"/>
        <line x1="40" y1="120" x2="320" y2="120" stroke="#64748B" stroke-width="1.5"/>
        <line x1="180" y1="20" x2="180" y2="220" stroke="#64748B" stroke-width="1.5"/>
        <path d="M 50 50 Q 140 240 230 50" fill="none" stroke="#F59E0B" stroke-width="3"/>
        <circle cx="140" cy="175" r="4" fill="#F59E0B"/>
        <text x="20" y="30" fill="#94A3B8" font-family="sans-serif" font-size="14" font-weight="bold">Pilihan C</text>
      </svg>`,
    },

    // 11. Option D: Parabola opening downward with vertex (-1, 4)
    {
      filename: 'opt-parabola-d.webp',
      width: 360,
      height: 240,
      svg: `
      <svg width="360" height="240" viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="240" fill="#1E293B" rx="10"/>
        <line x1="40" y1="120" x2="320" y2="120" stroke="#64748B" stroke-width="1.5"/>
        <line x1="180" y1="20" x2="180" y2="220" stroke="#64748B" stroke-width="1.5"/>
        <path d="M 50 200 Q 140 10 230 200" fill="none" stroke="#A855F7" stroke-width="3"/>
        <circle cx="140" cy="65" r="4" fill="#F59E0B"/>
        <text x="20" y="30" fill="#94A3B8" font-family="sans-serif" font-size="14" font-weight="bold">Pilihan D</text>
      </svg>`,
    },
  ];

  for (const d of diagrams) {
    const destPath = path.join(outputDir, d.filename);
    try {
      await sharp(Buffer.from(d.svg.trim()))
        .webp({ quality: 90 })
        .toFile(destPath);
    } catch (e) {
      console.warn(`[seed-diagrams] Failed to generate ${d.filename}:`, e);
    }
  }
}
