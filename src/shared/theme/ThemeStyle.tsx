import { colors } from './colors'
import { radius } from './radius'
import { spacing } from './spacing'
import { typography } from './typography'

export function ThemeStyle() {
  const toRgba = (hex: string, alpha: number) => {
    const cleanHex = hex.replace('#', '')
    const r = Number.parseInt(cleanHex.slice(0, 2), 16)
    const g = Number.parseInt(cleanHex.slice(2, 4), 16)
    const b = Number.parseInt(cleanHex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return (
    <style>{`
      :root {
        --color-brand-primary: ${colors.brandPrimary};
        --color-brand-primary-hover: ${colors.brandPrimaryHover};
        --color-brand-primary-dark: ${colors.brandPrimaryDark};
        --color-success: ${colors.success};
        --color-warning: ${colors.warning};
        --color-danger: ${colors.danger};
        --color-background: ${colors.background};
        --color-surface: ${colors.surface};
        --color-surface-light: ${colors.surfaceLight};
        --color-text-primary: ${colors.textPrimary};
        --color-text-secondary: ${colors.textSecondary};
        --color-border: ${colors.border};

        --space-xs: ${spacing.xs}px;
        --space-sm: ${spacing.sm}px;
        --space-md: ${spacing.md}px;
        --space-lg: ${spacing.lg}px;
        --space-xl: ${spacing.xl}px;

        --radius-sm: ${radius.sm}px;
        --radius-md: ${radius.md}px;
        --radius-lg: ${radius.lg}px;
        --radius-xl: ${radius.xl}px;

        --font-family-base: ${typography.fontFamily};
        --font-weight-regular: ${typography.fontWeight.regular};
        --font-weight-medium: ${typography.fontWeight.medium};
        --font-weight-semibold: ${typography.fontWeight.semibold};
        --font-weight-bold: ${typography.fontWeight.bold};

        --font-title-size: ${typography.title.fontSize};
        --font-title-line-height: ${typography.title.lineHeight};
        --font-title-weight: ${typography.title.fontWeight};

        --font-subtitle-size: ${typography.subtitle.fontSize};
        --font-subtitle-line-height: ${typography.subtitle.lineHeight};
        --font-subtitle-weight: ${typography.subtitle.fontWeight};

        --font-body-size: ${typography.body.fontSize};
        --font-body-line-height: ${typography.body.lineHeight};
        --font-body-weight: ${typography.body.fontWeight};

        --font-caption-size: ${typography.caption.fontSize};
        --font-caption-line-height: ${typography.caption.lineHeight};
        --font-caption-weight: ${typography.caption.fontWeight};

        /* Legacy aliases preserved for current app compatibility */
        --color-bg-canvas: var(--color-background);
        --color-bg-canvas-accent: var(--color-surface);
        --color-bg-surface: var(--color-surface);
        --color-bg-surface-raised: var(--color-surface-light);
        --color-bg-overlay: ${toRgba(colors.background, 0.82)};
        --color-bg-glow: ${toRgba(colors.brandPrimary, 0.18)};
        --color-border-subtle: ${toRgba(colors.border, 0.35)};
        --color-border-strong: ${toRgba(colors.border, 0.7)};
        --color-border-brand: ${toRgba(colors.brandPrimary, 0.35)};
        --color-text-muted: ${toRgba(colors.textSecondary, 0.75)};
        --color-brand-primary-soft: ${toRgba(colors.brandPrimary, 0.16)};
        --color-brand-primary-ring: ${toRgba(colors.brandPrimary, 0.22)};
        --color-success-base: var(--color-success);
        --color-success-soft: ${toRgba(colors.success, 0.2)};
        --color-success-strong: ${toRgba(colors.success, 0.75)};
        --color-danger-base: var(--color-danger);
        --color-danger-soft: ${toRgba(colors.danger, 0.2)};
        --color-danger-strong: ${toRgba(colors.danger, 0.75)};
        --color-warning-base: var(--color-warning);
        --color-warning-soft: ${toRgba(colors.warning, 0.18)};
        --font-size-sm: var(--font-caption-size);
        --font-size-md: var(--font-body-size);
        --font-size-lg: var(--font-subtitle-size);
        --font-size-xl: var(--font-title-size);
        --font-size-2xl: clamp(1.85rem, 2vw, 2.2rem);
        --font-size-3xl: clamp(2.25rem, 4vw, 2.75rem);
        --space-2xl: calc(var(--space-xl) + var(--space-sm));
      }
    `}</style>
  )
}