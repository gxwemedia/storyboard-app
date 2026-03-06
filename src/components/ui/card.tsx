import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('glass-border rounded-[28px] border border-white/8 bg-[rgba(9,16,32,0.84)] shadow-[0_20px_60px_-28px_rgba(15,23,42,0.95)] backdrop-blur-xl', className)} {...props} />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn('flex flex-col gap-2 p-6', className)} {...props} />)
CardHeader.displayName = 'CardHeader'
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => <h3 ref={ref} className={cn('text-lg font-semibold tracking-tight text-white', className)} {...props} />)
CardTitle.displayName = 'CardTitle'
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => <p ref={ref} className={cn('text-sm leading-6 text-slate-400', className)} {...props} />)
CardDescription.displayName = 'CardDescription'
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn('px-6 pb-6', className)} {...props} />)
CardContent.displayName = 'CardContent'

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
