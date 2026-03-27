import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2023',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
})
