const integer = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const fmtInt = (n: number) => integer.format(n);
export const fmt1 = (n: number) => oneDecimal.format(n);
export const fmt2 = (n: number) => twoDecimals.format(n);
export const fmtPct = (share: number) => `${oneDecimal.format(share * 100)} %`;
export const fmtSigned = (n: number) => (n > 0 ? `+${integer.format(n)}` : integer.format(n));
export const fmtSignedPct = (share: number) => `${share > 0 ? '+' : ''}${oneDecimal.format(share * 100)} %`;
export const fmtDate = (iso: string) => dateFormat.format(new Date(`${iso}T12:00:00`));
export const fmtDuration = (sec: number | null) =>
  sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} min` : '–';
