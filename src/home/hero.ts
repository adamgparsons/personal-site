import type { AsciiEffect, HeroConfig } from '../types'

const HERO_TEXT = 'I\'m Adam Parsons, a Design Engineer based in London. <span class="hero-sub">I enjoy turning ideas into interfaces with design and code.</span> <span class="hero-current">Currently at <a class="hero-link" href="https://nala.com">Nala</a>.</span>'

const COPY_FEEDBACK_MS = 2000

export function renderHero(container: HTMLElement, effect: AsciiEffect, c: HeroConfig) {
  container.innerHTML = ''
  container.className = 'hero-container'

  const posMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const
  container.style.setProperty('--hero-bg-color', c.theme.bgColor)
  container.style.setProperty('--hero-bg-opacity', String(c.ascii.opacity))
  container.style.setProperty('--hero-text-position', posMap[c.hero.textPosition])
  container.style.setProperty('--hero-text-opacity', String(c.hero.textOpacity))
  container.style.setProperty('--hero-title-color', c.theme.dark ? '#85FFE9' : '#000')

  const bg = document.createElement('div')
  bg.className = 'ascii-bg'
  container.appendChild(bg)

  const textBlock = document.createElement('div')
  textBlock.className = 'hero-text'
  textBlock.hidden = !c.hero.showText

  const h1 = document.createElement('h1')
  h1.className = 'hero-h1'
  h1.innerHTML = HERO_TEXT

  textBlock.appendChild(h1)
  container.appendChild(textBlock)

  const nav = document.createElement('nav')
  nav.className = 'hero-nav'

  const emailBtn = document.createElement('a')
  emailBtn.className = 'nav-link'
  emailBtn.href = '#'
  emailBtn.textContent = 'Email'
  emailBtn.addEventListener('click', (e) => {
    e.preventDefault()
    const addr = ['adam', 'adamparsons', 'me'].join('@').replace('@me', '.me')
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr).then(() => {
        emailBtn.textContent = 'Copied'
        emailBtn.classList.add('nav-link--copied')
        setTimeout(() => {
          emailBtn.textContent = 'Email'
          emailBtn.classList.remove('nav-link--copied')
        }, COPY_FEEDBACK_MS)
      })
    } else {
      window.location.href = 'mailto:' + addr
    }
  })

  nav.appendChild(emailBtn)
  container.appendChild(nav)

  effect.mount(bg, c.image, c.ascii, c.animation)
}
