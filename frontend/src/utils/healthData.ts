// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface Campaign {
  color: string;
  label: string;
  cause: string;
  hex: string;
  textHex: string;
  accentHex: string;
}

export interface MonthData {
  month: string;
  monthShort: string;
  number: number;
  campaigns: Campaign[];
  bgGradient: string;
  patternColor: string;
}

// ── Dados do calendário de saúde ──────────────────────────────────────────────
export const HEALTH_CALENDAR: MonthData[] = [
  {
    month: "Janeiro",
    monthShort: "JAN",
    number: 1,
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)",
    patternColor: "rgba(79, 70, 229, 0.08)",
    campaigns: [
      { color: "Branco", label: "Janeiro Branco", cause: "Saúde Mental", hex: "#4f46e5", textHex: "#fff", accentHex: "#e0e7ff" },
      { color: "Roxo", label: "Combate à Hanseníase", cause: "Hanseníase", hex: "#7c3aed", textHex: "#fff", accentHex: "#f5f3ff" },
    ],
  },
  {
    month: "Fevereiro",
    monthShort: "FEV",
    number: 2,
    bgGradient: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)",
    patternColor: "rgba(124, 58, 237, 0.12)",
    campaigns: [
      { color: "Roxo", label: "Fevereiro Roxo", cause: "Lúpus, Alzheimer e Fibromialgia", hex: "#8b5cf6", textHex: "#fff", accentHex: "#f5f3ff" },
      { color: "Laranja", label: "Campanha Laranja", cause: "Leucemia", hex: "#f97316", textHex: "#fff", accentHex: "#fff7ed" },
    ],
  },
  {
    month: "Março",
    monthShort: "MAR",
    number: 3,
    bgGradient: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)",
    patternColor: "rgba(168, 85, 247, 0.12)",
    campaigns: [
      { color: "Lilás", label: "Março Lilás", cause: "Câncer do Colo de Útero", hex: "#a855f7", textHex: "#fff", accentHex: "#faf5ff" },
      { color: "Azul-marinho", label: "Março Azul-Marinho", cause: "Câncer Colorretal", hex: "#0369a1", textHex: "#fff", accentHex: "#f0f9ff" },
    ],
  },
  {
    month: "Abril",
    monthShort: "ABR",
    number: 4,
    bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
    patternColor: "rgba(22, 163, 74, 0.1)",
    campaigns: [
      { color: "Azul", label: "Abril Azul", cause: "Autismo (TEA)", hex: "#2563eb", textHex: "#fff", accentHex: "#eff6ff" },
      { color: "Verde", label: "Abril Verde", cause: "Segurança no Trabalho", hex: "#16a34a", textHex: "#fff", accentHex: "#f0fdf4" },
    ],
  },
  {
    month: "Maio",
    monthShort: "MAI",
    number: 5,
    bgGradient: "linear-gradient(135deg, #fefce8 0%, #fef08a 50%, #fde047 100%)",
    patternColor: "rgba(234, 179, 8, 0.12)",
    campaigns: [
      { color: "Amarelo", label: "Maio Amarelo", cause: "Prevenção no Trânsito", hex: "#ca8a04", textHex: "#fff", accentHex: "#fefce8" },
      { color: "Roxo", label: "Maio Roxo", cause: "Doenças Intestinais", hex: "#9333ea", textHex: "#fff", accentHex: "#f5f3ff" },
      { color: "Cinza", label: "Maio Cinza", cause: "Câncer Cerebral", hex: "#64748b", textHex: "#fff", accentHex: "#f8fafc" },
    ],
  },
  {
    month: "Junho",
    monthShort: "JUN",
    number: 6,
    bgGradient: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)",
    patternColor: "rgba(220, 38, 38, 0.1)",
    campaigns: [
      { color: "Vermelho", label: "Junho Vermelho", cause: "Doação de Sangue", hex: "#dc2626", textHex: "#fff", accentHex: "#fef2f2" },
      { color: "Laranja", label: "Junho Laranja", cause: "Anemia e Leucemia", hex: "#ea580c", textHex: "#fff", accentHex: "#fff7ed" },
      { color: "Verde", label: "Dia do Meio Ambiente", cause: "Meio Ambiente", hex: "#16a34a", textHex: "#fff", accentHex: "#f0fdf4" },
    ],
  },
  {
    month: "Julho",
    monthShort: "JUL",
    number: 7,
    bgGradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)",
    patternColor: "rgba(217, 119, 6, 0.1)",
    campaigns: [
      { color: "Amarelo", label: "Julho Amarelo", cause: "Hepatites Virais", hex: "#d97706", textHex: "#fff", accentHex: "#fffbeb" },
      { color: "Verde", label: "Julho Verde", cause: "Câncer de Cabeça e Pescoço", hex: "#15803d", textHex: "#fff", accentHex: "#f0fdf4" },
    ],
  },
  {
    month: "Agosto",
    monthShort: "AGO",
    number: 8,
    bgGradient: "linear-gradient(135deg, #fffcf0 0%, #fef3c7 50%, #fde68a 100%)",
    patternColor: "rgba(180, 83, 9, 0.1)",
    campaigns: [
      { color: "Dourado", label: "Agosto Dourado", cause: "Aleitamento Materno", hex: "#b45309", textHex: "#fff", accentHex: "#fffbeb" },
      { color: "Laranja", label: "Agosto Laranja", cause: "Esclerose Múltipla", hex: "#c2410c", textHex: "#fff", accentHex: "#fff7ed" },
      { color: "Lilás", label: "Agosto Lilás", cause: "Violência contra a Mulher", hex: "#7c3aed", textHex: "#fff", accentHex: "#f5f3ff" },
    ],
  },
  {
    month: "Setembro",
    monthShort: "SET",
    number: 9,
    bgGradient: "linear-gradient(135deg, #fefce8 0%, #fef9c3 50%, #fef08a 100%)",
    patternColor: "rgba(202, 138, 4, 0.12)",
    campaigns: [
      { color: "Amarelo", label: "Setembro Amarelo", cause: "Prevenção ao Suicídio", hex: "#ca8a04", textHex: "#fff", accentHex: "#fefce8" },
      { color: "Vermelho", label: "Setembro Vermelho", cause: "Doenças Cardiovasculares", hex: "#b91c1c", textHex: "#fff", accentHex: "#fef2f2" },
      { color: "Verde", label: "Setembro Verde", cause: "Doação de Órgãos", hex: "#15803d", textHex: "#fff", accentHex: "#f0fdf4" },
    ],
  },
  {
    month: "Outubro",
    monthShort: "OUT",
    number: 10,
    bgGradient: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
    patternColor: "rgba(219, 39, 119, 0.1)",
    campaigns: [
      { color: "Rosa", label: "Outubro Rosa", cause: "Câncer de Mama", hex: "#db2777", textHex: "#fff", accentHex: "#fdf2f8" },
    ],
  },
  {
    month: "Novembro",
    monthShort: "NOV",
    number: 11,
    bgGradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
    patternColor: "rgba(37, 99, 235, 0.1)",
    campaigns: [
      { color: "Azul", label: "Novembro Azul", cause: "Câncer de Próstata", hex: "#2563eb", textHex: "#fff", accentHex: "#eff6ff" },
      { color: "Dourado", label: "Novembro Dourado", cause: "Câncer Infantojuvenil", hex: "#b45309", textHex: "#fff", accentHex: "#fffbeb" },
    ],
  },
  {
    month: "Dezembro",
    monthShort: "DEZ",
    number: 12,
    bgGradient: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)",
    patternColor: "rgba(185, 28, 28, 0.1)",
    campaigns: [
      { color: "Vermelho", label: "Dezembro Vermelho", cause: "Prevenção ao HIV/AIDS", hex: "#b91c1c", textHex: "#fff", accentHex: "#fef2f2" },
      { color: "Laranja", label: "Dezembro Laranja", cause: "Câncer de Pele", hex: "#c2410c", textHex: "#fff", accentHex: "#fff7ed" },
    ],
  },
];
