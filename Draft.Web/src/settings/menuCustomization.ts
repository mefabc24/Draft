export const MENU_ITEM_PLACEMENTS = [
  'Visible',
  'Overflow',
  'Disabled',
] as const

export type MenuItemPlacement = (typeof MENU_ITEM_PLACEMENTS)[number]

export type MenuItemCustomization<TId extends string = string> = {
  id: TId
  placement: MenuItemPlacement
}

export type FloatingMarkdownToolbarItemId =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'image'
  | 'list'
  | 'comment'
  | 'spoiler'
  | 'highlight'
  | 'badge'
  | 'uppercase'
  | 'lowercase'

export type QuickInsertItemId =
  | 'lists'
  | 'headings'
  | 'link'
  | 'blockquote'
  | 'table'
  | 'codeblocks'
  | 'image'
  | 'keyboard'
  | 'expander'
  | 'tag'
  | 'callouts'
  | 'miscellaneous'

export type FloatingMarkdownToolbarItemCustomization =
  MenuItemCustomization<FloatingMarkdownToolbarItemId>

export type QuickInsertItemCustomization =
  MenuItemCustomization<QuickInsertItemId>

export const DEFAULT_FLOATING_MARKDOWN_TOOLBAR_ITEMS = [
  { id: 'heading', placement: 'Visible' },
  { id: 'bold', placement: 'Visible' },
  { id: 'italic', placement: 'Visible' },
  { id: 'underline', placement: 'Visible' },
  { id: 'strikethrough', placement: 'Visible' },
  { id: 'code', placement: 'Visible' },
  { id: 'link', placement: 'Visible' },
  { id: 'image', placement: 'Visible' },
  { id: 'list', placement: 'Visible' },
  { id: 'comment', placement: 'Overflow' },
  { id: 'spoiler', placement: 'Overflow' },
  { id: 'highlight', placement: 'Overflow' },
  { id: 'badge', placement: 'Overflow' },
  { id: 'uppercase', placement: 'Overflow' },
  { id: 'lowercase', placement: 'Overflow' },
] as const satisfies readonly FloatingMarkdownToolbarItemCustomization[]

export const DEFAULT_QUICK_INSERT_ITEMS = [
  { id: 'lists', placement: 'Visible' },
  { id: 'headings', placement: 'Visible' },
  { id: 'link', placement: 'Visible' },
  { id: 'blockquote', placement: 'Visible' },
  { id: 'table', placement: 'Visible' },
  { id: 'codeblocks', placement: 'Visible' },
  { id: 'image', placement: 'Overflow' },
  { id: 'keyboard', placement: 'Overflow' },
  { id: 'expander', placement: 'Overflow' },
  { id: 'tag', placement: 'Overflow' },
  { id: 'callouts', placement: 'Overflow' },
  { id: 'miscellaneous', placement: 'Overflow' },
] as const satisfies readonly QuickInsertItemCustomization[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readProperty(record: Record<string, unknown>, name: string) {
  const pascalName = `${name[0]?.toUpperCase() ?? ''}${name.slice(1)}`
  return record[name] ?? record[pascalName]
}

function normalizeMenuItemPlacement(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  switch (value.toLowerCase()) {
    case 'visible':
      return 'Visible' as const
    case 'overflow':
      return 'Overflow' as const
    case 'disabled':
      return 'Disabled' as const
    default:
      return null
  }
}

function normalizeMenuItems<TId extends string>(
  value: unknown,
  defaults: readonly MenuItemCustomization<TId>[],
): MenuItemCustomization<TId>[] {
  const defaultsById = new Map(
    defaults.map((item) => [item.id.toLowerCase(), item]),
  )
  const seenIds = new Set<TId>()
  const normalizedItems: MenuItemCustomization<TId>[] = []

  if (Array.isArray(value)) {
    for (const candidate of value) {
      if (!isRecord(candidate)) {
        continue
      }

      const id = readProperty(candidate, 'id')

      if (typeof id !== 'string') {
        continue
      }

      const defaultItem = defaultsById.get(id.trim().toLowerCase())

      if (!defaultItem) {
        continue
      }

      const normalizedId = defaultItem.id

      if (seenIds.has(normalizedId)) {
        continue
      }

      const placement = normalizeMenuItemPlacement(
        readProperty(candidate, 'placement'),
      )

      normalizedItems.push({
        id: normalizedId,
        placement: placement ?? defaultItem.placement,
      })
      seenIds.add(normalizedId)
    }
  }

  for (const defaultItem of defaults) {
    if (seenIds.has(defaultItem.id)) {
      continue
    }

    normalizedItems.push({ ...defaultItem })
  }

  return normalizedItems
}

export function normalizeFloatingMarkdownToolbarItems(
  value: unknown,
): FloatingMarkdownToolbarItemCustomization[] {
  return normalizeMenuItems(value, DEFAULT_FLOATING_MARKDOWN_TOOLBAR_ITEMS)
}

export function normalizeQuickInsertItems(
  value: unknown,
): QuickInsertItemCustomization[] {
  return normalizeMenuItems(value, DEFAULT_QUICK_INSERT_ITEMS)
}
