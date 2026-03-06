import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'
export const Tabs = TabsPrimitive.Root
export const TabsList = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) => <TabsPrimitive.List className={cn('inline-flex h-10 items-center rounded-2xl border border-white/10 bg-slate-900/80 p-1 text-slate-400', className)} {...props} />
export const TabsTrigger = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) => <TabsPrimitive.Trigger className={cn('inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium transition data-[state=active]:bg-sky-500/16 data-[state=active]:text-sky-100 data-[state=active]:shadow-sm', className)} {...props} />
export const TabsContent = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) => <TabsPrimitive.Content className={cn('mt-4 outline-none', className)} {...props} />
