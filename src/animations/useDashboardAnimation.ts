import { useEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
export function useDashboardAnimation(root: RefObject<HTMLDivElement | null>, disabled: boolean, revision: number) {
  useEffect(() => {
    if (disabled || !root.current) return
    const context = gsap.context(() => {
      gsap.from('.hero-reveal', { y: 15, opacity: 0, stagger: .07, duration: .6, ease: 'power2.out' })
      gsap.from('.stat-card', { y: 14, opacity: 0, stagger: .06, duration: .45, delay: .2 })
      gsap.utils.toArray<HTMLElement>('.section-reveal').forEach(section => {
        gsap.from(section, { y: 18, opacity: 0, duration: .5, scrollTrigger: { trigger: section, start: 'top 96%', once: true } })
      })
      gsap.to('.hero-orbit-graphic', { y: -12, ease: 'none', scrollTrigger: { trigger: '.welcome-hero', start: 'top top', end: 'bottom top', scrub: 1 } })
      ScrollTrigger.refresh()
    }, root)
    return () => context.revert()
  }, [root, disabled, revision])
}
