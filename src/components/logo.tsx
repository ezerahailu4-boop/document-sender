export function TafLogo({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Stylized energy/flame mark: an upward droplet built from two
          overlapping arcs, evoking both a flame and a fuel drop —
          fitting for an energies company, distinct from a generic icon. */}
      <path
        d="M16 2C16 2 8 12.5 8 19.5C8 24.19 11.58 28 16 28C20.42 28 24 24.19 24 19.5C24 12.5 16 2 16 2Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M16 6.5C16 6.5 10.5 14.2 10.5 19.8C10.5 23.2 12.96 26 16 26C19.04 26 21.5 23.2 21.5 19.8C21.5 14.2 16 6.5 16 6.5Z"
        fill="currentColor"
      />
      <path
        d="M16 14C16 14 13.5 17.8 13.5 20.3C13.5 21.8 14.62 23 16 23C17.38 23 18.5 21.8 18.5 20.3C18.5 17.8 16 14 16 14Z"
        fill="var(--color-background, white)"
        fillOpacity="0.9"
      />
    </svg>
  );
}
