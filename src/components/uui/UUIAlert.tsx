import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex gap-3 rounded-lg border p-4 text-sm items-start",
  {
    variants: {
      variant: {
        info: "border-primary/20 bg-primary/5 text-foreground [&>svg.uui-icon]:text-primary",
        success:
          "border-success/25 bg-success/5 text-foreground [&>svg.uui-icon]:text-success",
        warning:
          "border-warning/30 bg-warning/10 text-foreground [&>svg.uui-icon]:text-warning",
        error:
          "border-destructive/25 bg-destructive/5 text-foreground [&>svg.uui-icon]:text-destructive",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

export interface UUIAlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  hideIcon?: boolean;
}

/**
 * Untitled UI-inspired inline alert. Use for persistent, in-page messages
 * (empty states, warnings, blocking notices). Toasts remain in useToast.
 */
export function UUIAlert({
  variant = "info",
  title,
  action,
  onDismiss,
  hideIcon,
  className,
  children,
  ...rest
}: UUIAlertProps) {
  const Icon = iconMap[variant ?? "info"];
  return (
    <div className={cn(alertVariants({ variant }), className)} {...rest}>
      {!hideIcon && <Icon className="uui-icon h-5 w-5 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-semibold leading-tight">{title}</div>
        )}
        {children && (
          <div className={cn("text-muted-foreground", title && "mt-1")}>
            {children}
          </div>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
