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
        'font-nunito font-bold rounded-full transition active:opacity-80 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-brand text-white px-5 py-3.5 text-base',
        variant === 'ghost'   && 'bg-white border border-border text-text-primary px-5 py-3.5 text-base',
        variant === 'muted'   && 'bg-surface-secondary text-text-secondary px-4 py-2.5 text-sm',
        fullWidth && 'w-full py-[18px] text-[17px]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
