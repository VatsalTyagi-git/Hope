import React from 'react';

export function CornerIllustrations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {/* Soft atmospheric gradient glow spots */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 left-1/3 w-[500px] h-72 bg-purple-100/60 rounded-full blur-3xl" />

      {/* TOP LEFT VIGNETTE: Remote Virtual Counseling */}
      <div className="absolute top-16 left-4 md:top-20 md:left-12 lg:left-16 w-36 sm:w-44 md:w-56 opacity-85 hover:opacity-100 transition-opacity">
        <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-sm">
          {/* Subtle glow circle */}
          <circle cx="120" cy="120" r="90" fill="#F3EEFE" fillOpacity="0.5" />
          {/* Tablet Frame */}
          <rect x="25" y="45" width="80" height="120" rx="10" fill="#FFFFFF" stroke="#6366F1" strokeWidth="2.5" />
          <rect x="30" y="52" width="70" height="98" rx="6" fill="#EDE9FE" />
          {/* Therapist inside screen */}
          <circle cx="65" cy="85" r="14" fill="#818CF8" />
          <path d="M48 124C48 108 55 104 65 104C75 104 82 108 82 124" fill="#4F46E5" />
          {/* Thought / Speech bubble */}
          <path d="M100 50C100 42 110 38 122 38C134 38 144 44 144 52C144 58 138 62 130 64L134 72L124 65C122 65 120 65 118 65C108 65 100 58 100 50Z" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="1.5" />
          <circle cx="114" cy="51" r="2" fill="#93C5FD" />
          <circle cx="122" cy="51" r="2" fill="#93C5FD" />
          <circle cx="130" cy="51" r="2" fill="#93C5FD" />
          {/* Couch / Recliner */}
          <path d="M90 145H195C200 145 204 149 204 154V165C204 170 200 174 195 174H90V145Z" fill="#C7D2FE" />
          <path d="M190 130C190 125 194 120 200 120C206 120 210 125 210 130V174H190V130Z" fill="#A5B4FC" />
          <rect x="100" y="174" width="6" height="18" rx="3" fill="#6366F1" />
          <rect x="180" y="174" width="6" height="18" rx="3" fill="#6366F1" />
          {/* Patient relaxing on couch */}
          <circle cx="170" cy="115" r="11" fill="#6366F1" />
          <path d="M140 145C140 132 152 128 165 128C175 128 185 132 185 145H140Z" fill="#4F46E5" />
          <path d="M140 145L120 152C116 153 113 158 115 162L116 165" stroke="#4F46E5" strokeWidth="7" strokeLinecap="round" />
        </svg>
      </div>

      {/* TOP RIGHT VIGNETTE: In-Person Supportive Session */}
      <div className="absolute top-16 right-4 md:top-20 md:right-12 lg:right-16 w-36 sm:w-44 md:w-56 opacity-85 hover:opacity-100 transition-opacity">
        <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-sm">
          {/* Warm ambient spotlight */}
          <path d="M180 20L150 200L220 200L210 20Z" fill="#FEF3C7" fillOpacity="0.45" />
          {/* Therapist on left side */}
          <circle cx="65" cy="85" r="13" fill="#3B82F6" />
          <path d="M48 140C48 115 54 105 68 105C82 105 88 115 88 140" fill="#1D4ED8" />
          {/* Chair */}
          <path d="M50 140H90V180H50Z" fill="#E2E8F0" />
          <rect x="52" y="180" width="5" height="20" rx="2" fill="#64748B" />
          <rect x="83" y="180" width="5" height="20" rx="2" fill="#64748B" />
          {/* Clipboard note */}
          <rect x="80" y="115" width="22" height="30" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="85" y1="123" x2="97" y2="123" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="85" y1="129" x2="95" y2="129" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          {/* Patient on right side (Hands on heart) */}
          <circle cx="180" cy="85" r="13" fill="#F59E0B" />
          <path d="M165 145C165 115 172 105 180 105C188 105 195 115 195 145" fill="#D97706" />
          {/* Hands over heart gesture */}
          <circle cx="180" cy="118" r="7" fill="#FDE68A" stroke="#B45309" strokeWidth="1.5" />
          {/* Chair */}
          <path d="M165 145H195V180H165Z" fill="#FEF3C7" />
          <rect x="168" y="180" width="5" height="20" rx="2" fill="#B45309" />
          <rect x="190" y="180" width="5" height="20" rx="2" fill="#B45309" />
          <path d="M172 145L168 185H176L180 145" fill="#F59E0B" />
          <path d="M188 145L184 185H192L196 145" fill="#F59E0B" />
        </svg>
      </div>

      {/* BOTTOM LEFT VIGNETTE: Compassionate Support & Emerging Butterflies */}
      <div className="absolute bottom-28 left-4 md:bottom-24 md:left-12 lg:left-16 w-36 sm:w-44 md:w-56 opacity-85 hover:opacity-100 transition-opacity">
        <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-sm">
          {/* Soft background aura */}
          <circle cx="100" cy="120" r="80" fill="#EDE9FE" fillOpacity="0.4" />
          {/* Seated bench */}
          <rect x="60" y="170" width="90" height="8" rx="3" fill="#CBD5E1" />
          <rect x="70" y="178" width="5" height="22" rx="2" fill="#94A3B8" />
          <rect x="135" y="178" width="5" height="22" rx="2" fill="#94A3B8" />
          {/* Patient seated forward */}
          <circle cx="115" cy="105" r="12" fill="#60A5FA" />
          <path d="M98 160C98 128 108 122 116 122C124 122 132 128 132 160" fill="#3B82F6" />
          <path d="M105 160L102 195H110L113 160" fill="#2563EB" />
          {/* Caregiver placing hand on back */}
          <circle cx="70" cy="98" r="12" fill="#818CF8" />
          <path d="M52 170C52 135 60 120 72 120C82 120 90 135 90 170" fill="#6366F1" />
          {/* Gentle hand on shoulder/back */}
          <path d="M85 128L106 132" stroke="#818CF8" strokeWidth="6" strokeLinecap="round" />
          {/* Emerging Butterflies (Symbol of Hope & Renewal) */}
          <g transform="translate(135, 80) scale(0.8)">
            <path d="M5 5C15 -5 25 5 15 15C5 25 -5 15 5 5Z" fill="#A78BFA" />
            <path d="M25 5C15 -5 5 5 15 15C25 25 35 15 25 5Z" fill="#C4B5FD" />
          </g>
          <g transform="translate(155, 60) scale(0.6)">
            <path d="M5 5C15 -5 25 5 15 15C5 25 -5 15 5 5Z" fill="#818CF8" />
            <path d="M25 5C15 -5 5 5 15 15C25 25 35 15 25 5Z" fill="#A5B4FC" />
          </g>
          <g transform="translate(170, 95) scale(0.65)">
            <path d="M5 5C15 -5 25 5 15 15C5 25 -5 15 5 5Z" fill="#93C5FD" />
            <path d="M25 5C15 -5 5 5 15 15C25 25 35 15 25 5Z" fill="#BFDBFE" />
          </g>
        </svg>
      </div>

      {/* BOTTOM RIGHT VIGNETTE: Empathetic Dialogue & Armchairs */}
      <div className="absolute bottom-28 right-4 md:bottom-24 md:right-12 lg:right-16 w-36 sm:w-44 md:w-56 opacity-85 hover:opacity-100 transition-opacity">
        <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-sm">
          {/* Speech bubble */}
          <path d="M150 70C150 62 160 56 175 56C190 56 202 62 202 70C202 76 195 81 185 83L188 92L178 84C176 84 174 84 172 84C158 84 150 78 150 70Z" fill="#FFFFFF" stroke="#A78BFA" strokeWidth="1.5" />
          {/* Left Armchair */}
          <path d="M40 145C40 135 48 130 58 130H80C90 130 98 135 98 145V180H40V145Z" fill="#EDE9FE" />
          <rect x="44" y="180" width="5" height="18" rx="2" fill="#7C3AED" />
          <rect x="89" y="180" width="5" height="18" rx="2" fill="#7C3AED" />
          {/* Left Person */}
          <circle cx="68" cy="95" r="12" fill="#7C3AED" />
          <path d="M50 155C50 125 58 118 68 118C78 118 86 125 86 155" fill="#6D28D9" />
          {/* Right Armchair */}
          <path d="M140 145C140 135 148 130 158 130H180C190 130 198 135 198 145V180H140V145Z" fill="#E0E7FF" />
          <rect x="144" y="180" width="5" height="18" rx="2" fill="#4F46E5" />
          <rect x="189" y="180" width="5" height="18" rx="2" fill="#4F46E5" />
          {/* Right Person gesturing */}
          <circle cx="168" cy="95" r="12" fill="#4F46E5" />
          <path d="M150 155C150 125 158 118 168 118C178 118 186 125 186 155" fill="#4338CA" />
          <path d="M154 135L138 130" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
