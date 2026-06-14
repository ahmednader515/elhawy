type BatShapeProps = {
  className?: string;
};

/**
 * Bat silhouette with a body and two membrane wings as separate groups so each
 * wing can rotate around the shoulder (real flapping). The wing flap animation
 * is defined in CSS (.bat-wing--l / .bat-wing--r) and driven by the --flap var
 * set on the parent wrapper.
 */
export function BatShape({ className = "intro-bat-svg" }: BatShapeProps) {
  return (
    <svg
      viewBox="0 0 200 110"
      className={className}
      width="100%"
      height="100%"
      aria-hidden
    >
      <g fill="#05030a">
        {/* Body */}
        <g className="bat-body">
          <polygon points="92,30 95,15 99,31" />
          <polygon points="108,30 105,15 101,31" />
          <circle cx="100" cy="38" r="9" />
          <ellipse cx="100" cy="60" rx="7.5" ry="22" />
        </g>

        {/* Left wing */}
        <path
          className="bat-wing bat-wing--l"
          d="M97 44
             C 80 31, 55 30, 30 36
             L 9 33
             C 17 44, 13 47, 25 49
             C 38 51, 31 56, 45 57
             C 59 58, 54 63, 70 64
             C 84 64, 90 61, 97 60
             Z"
        />

        {/* Right wing */}
        <path
          className="bat-wing bat-wing--r"
          d="M103 44
             C 120 31, 145 30, 170 36
             L 191 33
             C 183 44, 187 47, 175 49
             C 162 51, 169 56, 155 57
             C 141 58, 146 63, 130 64
             C 116 64, 110 61, 103 60
             Z"
        />
      </g>
    </svg>
  );
}
