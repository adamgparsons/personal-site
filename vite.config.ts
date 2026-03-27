import { defineConfig } from 'vite'

export default defineConfig({
  base: '/personal-site/',
  build: {
    target: 'es2023',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
})
