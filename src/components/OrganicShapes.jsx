export const HeartBlob = ({ className = '', fill = 'currentColor' }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M50 88 C20 70 5 45 15 22 C22 5 45 10 50 25 C55 10 78 5 85 22 C95 45 80 70 50 88 Z" 
      fill={fill} 
    />
  </svg>
);

export const StarBlob = ({ className = '', fill = 'currentColor' }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M50 10 L60 38 L90 40 L65 58 L75 88 L50 70 L25 88 L35 58 L10 40 L40 38 Z" 
      fill={fill} 
    />
  </svg>
);

export const PillBlob = ({ className = '', fill = 'currentColor' }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="30" width="60" height="40" rx="20" fill={fill} />
  </svg>
);

export const MoonBlob = ({ className = '', fill = 'currentColor' }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M70 20 A40 40 0 1 0 80 80 A45 45 0 0 1 70 20 Z" 
      fill={fill} 
    />
  </svg>
);

export const CloudBlob = ({ className = '', fill = 'currentColor' }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M20 60 A20 20 0 0 1 50 40 A25 25 0 0 1 90 60 Q95 80 70 80 L30 80 Q10 80 20 60 Z" 
      fill={fill} 
    />
  </svg>
);
