import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  icon?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function ActionButton({ children, icon, variant = 'primary', className = '', ...props }: Props) {
  return <button className={`action-button ${variant} ${className}`} {...props}>{icon}{children}</button>
}
