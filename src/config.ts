import type { HeroConfig } from './types'

export const config: HeroConfig = {
  image: import.meta.env.BASE_URL + 'images/hero.webp',
  ascii: {
    charset: ' _,-~:;=!*#$@',
    fontSize: 10,
    density: 1,
    contrast: 1.3,
    invert: false,
    colorMode: 'mono',
    customColor: '#e100ff',
    opacity: 0.45,
    imageFit: 'cover',
    imagePosition: 'center',
  },
  animation: {
    enabled: true,
    speed: 0.1,
    effect: 'wave',
  },
  theme: {
    dark: true,
    bgColor: '#000000',
  },
  hero: {
    textPosition: 'center',
    textAlign: 'left',
    textOpacity: 1,
    showText: true,
  },
}
