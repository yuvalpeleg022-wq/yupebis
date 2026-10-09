import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.15em] [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgb(183_255_156/0.35),0_10px_40px_-10px_rgb(70_214_44/0.7)] hover:bg-brand-pale hover:shadow-[0_0_0_1px_rgb(183_255_156/0.6),0_14px_50px_-8px_rgb(70_214_44/0.85)]",
        outline:
          "border border-brand/40 bg-background/40 text-foreground backdrop-blur hover:border-brand hover:bg-brand/10",
        ghost: "text-muted hover:bg-brand/10 hover:text-foreground",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 text-[15px]",
        sm: "h-9 px-4 text-sm",
        lg: "h-13 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
