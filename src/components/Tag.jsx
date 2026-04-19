export const Tag = ({ children, color = 'bg-app-pink', textColor = 'text-app-dark', className = '' }) => {
  return (
    <span className={`px-4 py-1.5 rounded-full text-sm font-body font-medium ${color} ${textColor} ${className}`}>
      {children}
    </span>
  );
};
