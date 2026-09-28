import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'build',
    // 'hidden' still writes the map for local debugging but omits the
    // //# sourceMappingURL comment, so the deploy does not advertise a 7MB
    // download to every visitor's devtools.
    sourcemap: 'hidden',
    // Two pages. The banner portfolio lives at /banners/ -- the path it always
    // had, which the About section links to -- and is built from this codebase
    // so it can share the site's components rather than imitate them. The
    // creatives themselves are static files under public/banners/creatives.
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        banners: resolve(import.meta.dirname, 'banners/index.html')
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true
  }
})
