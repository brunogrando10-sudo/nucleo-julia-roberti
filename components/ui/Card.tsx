interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = "", padding = true }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-brand-nude/20 shadow-sm
                  ${padding ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
