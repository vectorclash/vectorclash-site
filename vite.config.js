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
    sourcemap: 'hidden'
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true
  }
})
