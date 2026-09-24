import { colors } from './colors'
import { spacing } from './spacing'
import { typography } from './typography'

export function ThemeStyle() {
  return (
    <style>{`
      :root {
        --color-bg-canvas: ${colors.background};
        --color-bg-canvas-accent: ${colors.surface};
        --color-bg-surface: ${colors.surface};
        --color-bg-surface-raised: ${colors.surfaceLight};
        --color-bg-overlay: ${colors.overlay};
        --color-bg-glow: ${colors.backgroundGlow};
        --color-border-subtle: ${colors.borderSubtle};
        --color-border-strong: ${colors.borderStrong};
        --color-border-brand: ${colors.borderBrand};
        --color-text-primary: ${colors.textPrimary};
        --color-text-secondary: ${colors.textSecondary};
        --color-text-muted: ${colors.textMuted};
        --color-brand-primary: ${colors.brandPrimary};
        --color-brand-primary-hover: ${colors.brandPrimaryHover};
        --color-brand-primary-dark: ${colors.brandPrimaryDark};
        --color-brand-primary-soft: ${colors.brandPrimarySoft};
        --color-brand-primary-ring: ${colors.brandPrimaryRing};
        --color-success-base: ${colors.success};
        --color-success-soft: ${colors.successSoft};
        --color-success-strong: ${colors.successStrong};
        --color-success-surface: ${colors.successSurface};
        --color-danger-base: ${colors.danger};
        --color-danger-soft: ${colors.dangerSoft};
        --color-danger-strong: ${colors.dangerStrong};
        --color-danger-surface: ${colors.dangerSurface};
        --color-warning-base: ${colors.warning};
        --color-warning-soft: ${colors.warningSoft};
        --font-family-base: ${typography.fontFamily.base};
        --font-size-sm: ${typography.fontSize.sm};
        --font-size-md: ${typography.fontSize.md};
        --font-size-lg: ${typography.fontSize.lg};
        --font-size-xl: ${typography.fontSize.xl};
        --font-size-2xl: ${typography.fontSize['2xl']};
        --font-size-3xl: ${typography.fontSize['3xl']};
        --space-sm: ${spacing.sm};
        --space-md: ${spacing.md};
        --space-lg: ${spacing.lg};
        --space-xl: ${spacing.xl};
        --space-2xl: ${spacing['2xl']};
      }
    `}</style>
  )
}