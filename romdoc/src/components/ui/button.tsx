import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "muted"
  | "danger"
  | "danger-outline";

export type ButtonSize =
  | "sm"
  | "md"
  | "lg"
  | "icon";

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    isLoading?: boolean;
    loadingText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

function joinClasses(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function getVariantClass(variant: ButtonVariant) {
  switch (variant) {
    case "secondary":
      return "romdoc-button-secondary";
    case "muted":
      return "romdoc-button-muted";
    case "danger":
      return "romdoc-button-danger";
    case "danger-outline":
      return "romdoc-button-danger-outline";
    case "primary":
    default:
      return "romdoc-button-primary";
  }
}

function getSizeClass(size: ButtonSize) {
  switch (size) {
    case "sm":
      return "romdoc-button-sm";
    case "lg":
      return "romdoc-button-lg";
    case "icon":
      return "romdoc-button-icon";
    case "md":
    default:
      return "";
  }
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth = false,
    isLoading = false,
    loadingText = "Se încarcă...",
    leftIcon,
    rightIcon,
    disabled,
    className,
    children,
    type = "button",
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled ? true : undefined}
      aria-busy={isLoading ? true : undefined}
      data-variant={variant}
      data-size={size}
      className={joinClasses(
        "romdoc-button",
        getVariantClass(variant),
        getSizeClass(size),
        fullWidth && "romdoc-button-full",
        isLoading && "romdoc-button-loading",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
          <span aria-live="polite">{loadingText}</span>
        </>
      ) : (
        <>
          {leftIcon ? (
            <span aria-hidden="true" className="shrink-0">
              {leftIcon}
            </span>
          ) : null}

          <span>{children}</span>

          {rightIcon ? (
            <span aria-hidden="true" className="shrink-0">
              {rightIcon}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
});

export default Button;
