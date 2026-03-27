import './style.css'
import { config } from './config'
import { createCanvasEffect } from './effects/ascii-canvas'
import { renderHero } from './home/hero'

const app = document.querySelector<HTMLDivElement>('#app')!

const effect = createCanvasEffect()
renderHero(app, effect, config)

new ResizeObserver(() => {
  effect.update(config.ascii, config.animation)
}).observe(app)
