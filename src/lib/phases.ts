// The eight lunar phases double as the site's map: each one is a destination.
export interface Phase {
  name: string;
  label: string;
  href: string;
  /** id of the home-page section it points at, for scroll tracking */
  section?: string;
}

export const PHASES: Phase[] = [
  { name: "New Moon", label: "Home", href: "/", section: "top" },
  { name: "Waxing Crescent", label: "About", href: "/#about", section: "about" },
  { name: "First Quarter", label: "Logbook", href: "/#logbook", section: "logbook" },
  { name: "Waxing Gibbous", label: "Projects", href: "/#projects", section: "projects" },
  { name: "Full Moon", label: "Voyages", href: "/voyages/" },
  { name: "Waning Gibbous", label: "Observatory", href: "/observatory/" },
  { name: "Last Quarter", label: "Writing", href: "/writing/" },
  { name: "Waning Crescent", label: "Contact", href: "/#contact", section: "contact" },
];

/** SVG path for the lit part of a moon of radius r at phase i (0 = new … 4 = full … 7). */
export function litPath(i: number, r: number): string {
  if (i === 0) return "";
  if (i === 4) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
  const a = (i / 8) * Math.PI * 2;
  const rx = Math.abs(Math.cos(a)) * r;
  const waxing = i < 4;
  const crescent = i === 1 || i === 7;
  const limbSweep = waxing ? 1 : 0;
  const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  return `M0 ${-r}A${r} ${r} 0 0 ${limbSweep} 0 ${r}A${rx.toFixed(2)} ${r} 0 0 ${termSweep} 0 ${-r}Z`;
}
