import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'muted'
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'font-nunito font-bold rounded-full transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-brand text-white px-5 py-3 text-sm',
        variant === 'ghost'   && 'bg-white border border-border text-text-primary px-5 py-3 text-sm',
        variant === 'muted'   && 'bg-surface-secondary text-text-secondary px-4 py-2 text-xs',
        fullWidth && 'w-full py-4 text-base',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
