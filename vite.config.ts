import { defineConfig, type Plugin } from 'vite'

// Inline the built CSS into <head> and drop its <link>, removing one
// render-blocking request. The stylesheet is tiny, so the page is a single
// self-contained document on first paint.
function inlineCss(): Plugin {
  return {
    name: 'inline-critical-css',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html']
      if (!html || html.type !== 'asset') return
      let source = html.source.toString()
      for (const name of Object.keys(bundle)) {
        if (!name.endsWith('.css')) continue
        const css = bundle[name]
        if (css.type !== 'asset') continue
        const file = name.split('/').pop()!
        const link = new RegExp(`<link[^>]+href="[^"]*${file}"[^>]*>`)
        source = source.replace(link, `<style>${css.source.toString()}</style>`)
        delete bundle[name]
      }
      html.source = source
    },
  }
}

export default defineConfig({
  plugins: [inlineCss()],
  build: {
    target: 'es2023',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
})
