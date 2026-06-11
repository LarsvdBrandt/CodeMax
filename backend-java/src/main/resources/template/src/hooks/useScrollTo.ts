// Smooth-scrolls to a section by its HTML id attribute.
// Used by the navbar to jump to page sections without routing.
export function useScrollTo() {
  return function scrollTo(sectionId: string) {
    const el = document.getElementById(sectionId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
