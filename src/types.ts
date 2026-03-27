export type ColorMode = 'original' | 'mono' | 'custom'
export type AnimationEffect = 'wave' | 'pulse' | 'rain' | 'glitch' | 'scan' | 'drift'
export type ImageFit = 'cover' | 'contain' | 'fill'
export type ImagePosition = 'center' | 'top' | 'bottom' | 'left' | 'right'
export interface AsciiSettings {
  charset: string
  fontSize: number
  density: number
  contrast: number
  invert: boolean
  colorMode: ColorMode
  customColor: string
  opacity: number
  imageFit: ImageFit
  imagePosition: ImagePosition
}

export interface AnimationSettings {
  enabled: boolean
  speed: number
  effect: AnimationEffect
}

export interface AsciiEffect {
  mount(container: HTMLElement, imageSrc: string, settings: AsciiSettings, animation?: AnimationSettings): void
  update(settings: AsciiSettings, animation?: AnimationSettings): void
  destroy(): void
}

export interface HeroConfig {
  image: string
  ascii: AsciiSettings
  animation: AnimationSettings
  theme: {
    dark: boolean
    bgColor: string
  }
  hero: {
    textPosition: 'top' | 'center' | 'bottom'
    textAlign: 'left' | 'center' | 'right'
    textOpacity: number
    showText: boolean
  }
}
