type PreviewThemeOrderItem = {
  colorScheme: string
  familyId: string
  id: string
  label: string
}

const DEFAULT_PREVIEW_THEME_FAMILY_ID = 'draft'

function getFamilyOrder(familyId: string) {
  return familyId === DEFAULT_PREVIEW_THEME_FAMILY_ID ? 0 : 1
}

function getColorSchemeOrder(colorScheme: string) {
  if (colorScheme === 'dark') {
    return 0
  }

  if (colorScheme === 'light') {
    return 1
  }

  return 2
}

export function comparePreviewThemes(
  left: PreviewThemeOrderItem,
  right: PreviewThemeOrderItem,
) {
  const defaultFamilyOrder =
    getFamilyOrder(left.familyId) - getFamilyOrder(right.familyId)

  if (defaultFamilyOrder !== 0) {
    return defaultFamilyOrder
  }

  const familyOrder = left.familyId.localeCompare(right.familyId)

  if (familyOrder !== 0) {
    return familyOrder
  }

  const colorSchemeOrder =
    getColorSchemeOrder(left.colorScheme) -
    getColorSchemeOrder(right.colorScheme)

  if (colorSchemeOrder !== 0) {
    return colorSchemeOrder
  }

  const labelOrder = left.label.localeCompare(right.label)

  return labelOrder !== 0 ? labelOrder : left.id.localeCompare(right.id)
}
