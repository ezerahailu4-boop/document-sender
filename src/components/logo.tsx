import Image from "next/image";

// Source logo is 1762x1858 (not perfectly square) — compute height from
// the requested width so the mark never looks squashed.
const LOGO_ASPECT = 1858 / 1762;

export function TafLogo({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/branding/taf-logo-icon.png"
      alt="TAF Energies"
      width={size}
      height={Math.round(size * LOGO_ASPECT)}
      className={className}
      style={{ objectFit: "contain" }}
      priority
    />
  );
}
