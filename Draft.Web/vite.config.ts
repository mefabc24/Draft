import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'file-protocol-html',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html
            .replace(/\s+type="module"/g, '')
            .replace(/\s+crossorigin/g, '')
            .replace(/<script(?![^>]*\bdefer\b)\s+src=/g, '<script defer src=')
        },
      },
    },
  ],
  build: {
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
      },
    },
  },
})
