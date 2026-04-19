export const HighlightCard = ({ title, subtitle, value, shape, color, shapeClassName = '', textPosition = 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' }) => {
  const ShapeComponent = shape;
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <ShapeComponent className={shapeClassName} fill={color} />
      <div className={`absolute flex flex-col items-center justify-center ${textPosition}`}>
        <span className="font-heading font-medium text-app-dark leading-tight">{title}</span>
        <span className="font-body text-xs text-app-dark/70 text-center whitespace-nowrap">{subtitle}</span>
        {value && <span className="font-heading font-medium text-app-dark mt-1">{value}</span>}
      </div>
    </div>
  );
};
