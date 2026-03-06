import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
  {
    variants: {
      variant: {
        default: 'bg-sky-500 text-slate-950 shadow-[0_12px_40px_-18px_rgba(96,165,250,0.95)] hover:bg-sky-400',
        secondary: 'bg-slate-900/80 text-slate-100 ring-1 ring-white/10 hover:bg-slate-800/80',
        ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
        destructive: 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/20 hover:bg-rose-500/20',
        success: 'bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-400/20 hover:bg-emerald-400/22',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-xl px-3',
        lg: 'h-12 rounded-2xl px-5',
        icon: 'size-10 rounded-2xl',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
