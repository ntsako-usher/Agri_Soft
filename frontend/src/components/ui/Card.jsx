export default function Card({ as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag className={`card ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

// Title row used at the top of most cards: icon + title on the left, optional actions on the right.
export function CardHeading({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="card-heading">
      <div>
        <h3 className="card-title">
          {Icon && <Icon size={16} strokeWidth={1.8} aria-hidden="true" />}
          {title}
        </h3>
        {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
