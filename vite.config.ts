// Extensión de Owlbear Rodeo para coberturas (proyecto aparte del CPR Omni-Deck). [Claude Code · 2026-11-21]
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Carpeta donde queda publicada. Owlbear exige que las rutas del manifest empiecen con "/".
// Local (npm run dev): "/". GitHub Pages del repo (npm run build:pages): "/cpr-owlbear-coberturas/".
const PAGES_DIR = '/cpr-owlbear-coberturas/'

function owlbearManifest(dir: string): Plugin {
  const manifest = JSON.stringify({
    name: 'Coberturas Cyberpunk RED',
    version: '1.1.0',
    manifest_version: 1,
    description: 'Coberturas del Core p.182: paredes por tramos de 2 m y objetos marcados como cobertura; todos ven y dañan sus HP.',
    author: 'CPR Omni-Deck',
    icon: `${dir}icon.svg`,
    background_url: `${dir}background.html`,
    action: { title: 'Coberturas CPR', icon: `${dir}icon.svg`, popover: `${dir}index.html`, width: 360, height: 480 },
  }, null, 2)
  return {
    name: 'owlbear-manifest',
    configureServer(server) {
      server.middlewares.use('/manifest.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(manifest)
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: manifest })
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), owlbearManifest(mode === 'pages' ? PAGES_DIR : '/')],
  build: {
    rollupOptions: {
      input: {
        background: page('./background.html'),
        cover: page('./cover.html'),
        index: page('./index.html'),
      },
    },
  },
}))
