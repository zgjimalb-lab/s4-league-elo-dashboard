import { GROUP } from './data';

/**
 * Kategoriale Palette (dark), geprüft mit dem dataviz-Validator auf der Kartenfläche #161c27:
 * Helligkeitsband, Chroma, Farbsehschwäche-Abstand und Kontrast bestehen alle.
 * Reihenfolge = Sicherheitsmerkmal, nicht umsortieren.
 */
const PALETTE = [
  '#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767',
  // Platz 9–11 (Nov. 2026): je ≥ 15 ΔE (normal) und ≥ 10 ΔE (Rot-Grün-Schwäche) zu allen anderen,
  // ≥ 3:1 Kontrast. Limette und Türkis liegen bewusst etwas heller als das Band, sonst bleibt kein Abstand.
  '#a032d8', '#94c520', '#27c6dd',
];
/** Ab Platz 12 der Gruppenliste teilen sich alle ein neutrales Grau. */
export const GUEST_COLOR = '#7b8494';

/** Farbe folgt dem Spieler (Position in data/players.json), nie seinem Rang. */
export function playerColor(name: string): string {
  const index = GROUP.indexOf(name);
  return index >= 0 && index < PALETTE.length ? PALETTE[index] : GUEST_COLOR;
}

/** Einfarbige Balken (eine Serie) und Hervorhebungen */
export const ACCENT = PALETTE[0];
export const POSITIVE = '#3987e5';
export const NEGATIVE = '#e66767';
