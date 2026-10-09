import { useEffect } from "react"

/** Adds .is-visible to every .reveal element when it scrolls into view (once). */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"))
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible")
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}
