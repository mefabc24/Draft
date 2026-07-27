import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { comparePreviewThemes } from './src/themes/preview/support/previewThemeOrder'

const previewThemeIdPattern = /id:\s*['"](?<id>[^'"]+)['"]/u
const previewThemeLabelPattern = /label:\s*['"](?<label>[^'"]+)['"]/u
const previewThemeFamilyIdPattern =
  /familyId:\s*['"](?<familyId>[^'"]+)['"]/u
const previewThemeColorSchemePattern =
  /colorScheme:\s*['"](?<colorScheme>dark|light)['"]/u

function getPreviewThemeOptions() {
  const previewThemesPath = resolve(__dirname, 'src/themes/preview')

  return readdirSync(previewThemesPath)
    .filter((fileName) => fileName.endsWith('.previewTheme.ts'))
    .flatMap((fileName) => {
      const source = readFileSync(resolve(previewThemesPath, fileName), 'utf8')
      const id = previewThemeIdPattern.exec(source)?.groups?.id?.trim()
      const label =
        previewThemeLabelPattern.exec(source)?.groups?.label?.trim()
      const familyId =
        previewThemeFamilyIdPattern.exec(source)?.groups?.familyId?.trim()
      const colorScheme =
        previewThemeColorSchemePattern.exec(source)?.groups?.colorScheme?.trim()

      return id && label && familyId && colorScheme
        ? [{ id, label, familyId, colorScheme }]
        : []
    })
    .sort(comparePreviewThemes)
}

function previewThemeManifestPlugin(): Plugin {
  return {
    name: 'preview-theme-manifest',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'preview-theme-options.json',
        source: JSON.stringify({ themes: getPreviewThemeOptions() }, null, 2),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    previewThemeManifestPlugin(),
    {
      name: 'file-protocol-html',
      apply: 'build',
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
