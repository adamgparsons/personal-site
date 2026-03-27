import type { AsciiEffect, AsciiSettings, AnimationSettings, AnimationEffect } from '../types'

const CELL_WIDTH_RATIO = 0.6

function luminance(r: number, g: number, b: number, contrast: number, invert: boolean): number {
  let v = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  v = Math.pow(v, 1 / contrast)
  return invert ? 1 - v : v
}

function parseHexColor(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

interface EffectContext {
  x: number
  y: number
  rows: number
  cols: number
  time: number
  speed: number
  charCount: number
  pixels: Uint8ClampedArray
  contrast: number
  invert: boolean
}

type EffectResult = { offset: number } | { charIndex: number }

const effects: Record<AnimationEffect, (ctx: EffectContext) => EffectResult> = {
  wave({ x, y, time, speed, charCount }) {
    const wave = Math.sin(x * 0.15 + y * 0.1 + time * speed * 2) * 0.3
    const flicker = (Math.sin(time * speed * 7 + x * 3.7 + y * 5.3) * 0.5 + 0.5) * 0.15
    return { offset: (wave + flicker) * (charCount - 1) }
  },

  pulse({ time, speed, charCount }) {
    return { offset: Math.sin(time * speed * 2) * 0.4 * (charCount - 1) }
  },

  rain({ y, time, speed, rows, charCount }) {
    const fall = (y + time * speed * 10) % rows
    const streak = fall < 3 ? (3 - fall) / 3 : 0
    return { offset: streak * (charCount - 1) * 0.6 }
  },

  glitch({ x, y, time, speed, cols, charCount, pixels, contrast, invert }) {
    const rowSeed = Math.sin(y * 91.7 + Math.floor(time * speed * 3) * 47.3)
    if (rowSeed <= 0.7) return { offset: 0 }
    const shift = Math.floor(rowSeed * 7) - 3
    const sx = Math.max(0, Math.min(cols - 1, x + shift))
    const si = (y * cols + sx) * 4
    const b = luminance(pixels[si], pixels[si + 1], pixels[si + 2], contrast, invert)
    return { charIndex: Math.floor(b * (charCount - 1)) }
  },

  scan({ y, time, speed, rows, charCount }) {
    const scanY = (time * speed * 5) % rows
    const dist = Math.abs(y - scanY)
    const glow = Math.max(0, 1 - dist / 4)
    return { offset: glow * (charCount - 1) * 0.5 }
  },

  drift({ x, y, time, speed, cols, charCount, pixels, contrast, invert }) {
    const ddx = Math.sin(y * 0.1 + time * speed) * 3
    const sx = Math.max(0, Math.min(cols - 1, Math.round(x + ddx)))
    const si = (y * cols + sx) * 4
    const b = luminance(pixels[si], pixels[si + 1], pixels[si + 2], contrast, invert)
    return { charIndex: Math.floor(b * (charCount - 1)) }
  },
}

// Pre-built RGB lookup table: index 0-255 → "rgb(v,v,v)" string
const monoLUT: string[] = new Array(256)
for (let i = 0; i < 256; i++) monoLUT[i] = `rgb(${i},${i},${i})`

export function createCanvasEffect(): AsciiEffect {
  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null
  let offscreen: HTMLCanvasElement | null = null
  let offCtx: CanvasRenderingContext2D | null = null
  let img: HTMLImageElement | null = null
  let currentSettings: AsciiSettings | null = null
  let currentAnimation: AnimationSettings = { enabled: false, speed: 1, effect: 'wave' }
  let animFrame: number | null = null
  let container: HTMLElement | null = null
  let time = 0
  let visible = true
  let cachedColor: [number, number, number] = [0, 0, 0]
  let cachedFont = ''
  let lastCanvasW = 0
  let lastCanvasH = 0
  let lastCols = 0
  let lastRows = 0
  let lastFit: string = ''
  let lastPos: string = ''
  let cachedDx = 0
  let cachedDy = 0
  let cachedDw = 0
  let cachedDh = 0

  function onVisibilityChange() {
    visible = !document.hidden
    if (visible && currentAnimation.enabled && !animFrame) {
      render()
      startLoop()
    } else if (!visible) {
      stopLoop()
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)

  function cacheColor(s: AsciiSettings) {
    if (s.colorMode === 'custom') {
      cachedColor = parseHexColor(s.customColor)
    }
  }

  function render() {
    if (!canvas || !ctx || !offscreen || !offCtx || !img || !currentSettings) return

    const s = currentSettings
    const chars = s.charset
    const cellW = s.fontSize * CELL_WIDTH_RATIO * s.density
    const cellH = s.fontSize * s.density

    const w = container!.clientWidth
    const h = container!.clientHeight
    const resized = w !== lastCanvasW || h !== lastCanvasH
    if (resized) {
      canvas.width = w
      canvas.height = h
      lastCanvasW = w
      lastCanvasH = h
      cachedFont = '' // force font reset after canvas resize clears state
    }

    const cols = Math.floor(w / cellW)
    const rows = Math.floor(h / cellH)
    const gridChanged = cols !== lastCols || rows !== lastRows
    if (gridChanged) {
      offscreen.width = cols
      offscreen.height = rows
    }

    if (s.imageFit === 'fill') {
      offCtx.drawImage(img, 0, 0, cols, rows)
    } else {
      // Recalculate image positioning only when grid size or settings change
      if (gridChanged || s.imageFit !== lastFit || s.imagePosition !== lastPos) {
        const imgW = img.naturalWidth
        const imgH = img.naturalHeight
        const scaleX = cols / imgW
        const scaleY = rows / imgH
        const scale = s.imageFit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY)
        cachedDw = imgW * scale
        cachedDh = imgH * scale
        cachedDx = (cols - cachedDw) / 2
        cachedDy = (rows - cachedDh) / 2
        if (s.imagePosition === 'top') cachedDy = 0
        else if (s.imagePosition === 'bottom') cachedDy = rows - cachedDh
        else if (s.imagePosition === 'left') cachedDx = 0
        else if (s.imagePosition === 'right') cachedDx = cols - cachedDw
        lastFit = s.imageFit
        lastPos = s.imagePosition
      }
      offCtx.fillStyle = '#000'
      offCtx.fillRect(0, 0, cols, rows)
      offCtx.drawImage(img, cachedDx, cachedDy, cachedDw, cachedDh)
    }
    if (gridChanged) {
      lastCols = cols
      lastRows = rows
    }

    const imageData = offCtx.getImageData(0, 0, cols, rows)
    const pixels = imageData.data

    ctx.clearRect(0, 0, w, h)
    // Only set font when it changes
    const font = `${s.fontSize}px monospace`
    if (font !== cachedFont) {
      cachedFont = font
      ctx.font = font
      ctx.textBaseline = 'top'
    }

    const animating = currentAnimation.enabled
    const speed = currentAnimation.speed
    const effectFn = animating ? effects[currentAnimation.effect] : null
    const [customR, customG, customB] = cachedColor

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]

        const brightness = luminance(r, g, b, s.contrast, s.invert)
        let charIndex = Math.floor(brightness * (chars.length - 1))

        if (effectFn) {
          const result = effectFn({
            x, y, rows, cols, time, speed,
            charCount: chars.length,
            pixels, contrast: s.contrast, invert: s.invert,
          })
          if ('charIndex' in result) {
            charIndex = result.charIndex
          } else {
            charIndex = Math.round(charIndex + result.offset)
          }
          charIndex = Math.max(0, Math.min(chars.length - 1, charIndex))
        }

        const char = chars[charIndex]

        if (s.colorMode === 'mono') {
          ctx.fillStyle = monoLUT[(brightness * 255 + 0.5) | 0]
        } else if (s.colorMode === 'original') {
          ctx.fillStyle = `rgb(${r},${g},${b})`
        } else {
          ctx.fillStyle = `rgb(${(customR * brightness + 0.5) | 0},${(customG * brightness + 0.5) | 0},${(customB * brightness + 0.5) | 0})`
        }

        ctx.fillText(char, x * cellW, y * cellH)
      }
    }
  }

  function startLoop() {
    let last = performance.now()
    function tick(now: number) {
      const dt = (now - last) / 1000
      last = now
      time += dt
      render()
      animFrame = requestAnimationFrame(tick)
    }
    animFrame = requestAnimationFrame(tick)
  }

  function stopLoop() {
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = null
    }
  }

  return {
    mount(el, imageSrc, asciiSettings, animation) {
      container = el
      currentSettings = asciiSettings
      cacheColor(asciiSettings)
      if (animation) currentAnimation = animation

      canvas = document.createElement('canvas')
      canvas.className = 'ascii-canvas'
      el.appendChild(canvas)
      ctx = canvas.getContext('2d')!

      offscreen = document.createElement('canvas')
      offCtx = offscreen.getContext('2d', { willReadFrequently: true })!

      img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageSrc
      img.decode().then(() => {
        render()
        if (currentAnimation.enabled) startLoop()
      })
    },

    update(asciiSettings, animation) {
      currentSettings = asciiSettings
      cacheColor(asciiSettings)
      const wasAnimating = currentAnimation.enabled
      if (animation) currentAnimation = animation

      if (currentAnimation.enabled && !wasAnimating) {
        startLoop()
      } else if (!currentAnimation.enabled && wasAnimating) {
        stopLoop()
        render()
      } else if (!currentAnimation.enabled) {
        render()
      }
    },

    destroy() {
      stopLoop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (canvas && container) container.removeChild(canvas)
      canvas = null
      ctx = null
      offscreen = null
      offCtx = null
      img = null
      currentSettings = null
      container = null
    },
  }
}
