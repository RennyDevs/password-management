import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export default function Card({ children, hover = false, className = '', ...props }: CardProps) {
  const base = hover ? 'vault-card-hover' : 'vault-card';
  return (
    <div className={`${base} p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardSection({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
