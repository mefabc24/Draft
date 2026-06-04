import { createHeadingSlug } from './headingAnchorUtils'

function decodeAnchorId(anchorId: string) {
  try {
    return decodeURIComponent(anchorId)
  } catch {
    return anchorId
  }
}

function getCssEscapedId(id: string) {
  if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
    return null
  }

  return CSS.escape(id)
}

function findElementByExactId(root: HTMLElement, id: string) {
  if (root.id === id) {
    return root
  }

  const escapedId = getCssEscapedId(id)

  if (escapedId) {
    return root.querySelector<HTMLElement>(`#${escapedId}`)
  }

  return (
    Array.from(root.querySelectorAll<HTMLElement>('[id]')).find(
      (element) => element.id === id,
    ) ?? null
  )
}

function findElementByNormalizedId(root: HTMLElement, id: string) {
  const normalizedId = createHeadingSlug(id)

  if (root.id && createHeadingSlug(root.id) === normalizedId) {
    return root
  }

  return (
    Array.from(root.querySelectorAll<HTMLElement>('[id]')).find(
      (element) => element.id && createHeadingSlug(element.id) === normalizedId,
    ) ?? null
  )
}

function findElementById(root: HTMLElement, id: string) {
  return findElementByExactId(root, id) ?? findElementByNormalizedId(root, id)
}

function getScrollablePreviewElement(previewContentElement: HTMLElement) {
  const previewScrollElement =
    previewContentElement.closest<HTMLElement>('.preview-scroll')

  if (previewScrollElement) {
    return previewScrollElement
  }

  let parentElement = previewContentElement.parentElement

  while (parentElement) {
    const overflowY = getComputedStyle(parentElement).overflowY

    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parentElement.scrollHeight > parentElement.clientHeight
    ) {
      return parentElement
    }

    parentElement = parentElement.parentElement
  }

  return null
}

function getPreferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}

function getPreviewScrollTop(
  scrollElement: HTMLElement,
  targetElement: HTMLElement,
) {
  const scrollRect = scrollElement.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()
  const paddingTop = Number.parseFloat(getComputedStyle(scrollElement).paddingTop)
  const offset = Number.isFinite(paddingTop) ? paddingTop : 0

  return scrollElement.scrollTop + targetRect.top - scrollRect.top - offset
}

export function getPreviewAnchorIdFromHref(href: string | undefined) {
  const trimmedHref = href?.trim()

  if (!trimmedHref?.startsWith('#')) {
    return null
  }

  const anchorId = trimmedHref.slice(1)

  return anchorId ? decodeAnchorId(anchorId) : ''
}

export function scrollToPreviewAnchor(
  previewContentElement: HTMLElement,
  anchorId: string,
) {
  if (!anchorId) {
    return false
  }

  const targetElement = findElementById(previewContentElement, anchorId)
  const scrollElement = getScrollablePreviewElement(previewContentElement)

  if (!targetElement || !scrollElement) {
    return false
  }

  scrollElement.scrollTo({
    behavior: getPreferredScrollBehavior(),
    top: Math.max(0, getPreviewScrollTop(scrollElement, targetElement)),
  })

  return true
}
