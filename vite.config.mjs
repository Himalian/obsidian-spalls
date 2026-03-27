import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      svgr({
        // svgr options: https://react-svgr.com/docs/options/
        svgrOptions: {
          icon: true,
        },
        include: '**/*.svg?component',
        // This ensures that when you import with ?component, it's a React component
        // and default imports without suffix remain as strings/URLs
      }),
    ],
    build: {
      sourcemap: mode === 'development' ? 'inline' : false,
      minify: false,
      // Use Vite lib mode https://vitejs.dev/guide/build.html#library-mode
      lib: {
        entry: path.resolve(__dirname, './src/index.ts'),
        formats: ['cjs'],
      },
      rollupOptions: {
        output: {
          // Overwrite default Vite output fileName
          entryFileNames: 'main.js',
          assetFileNames: 'styles.css',
          dir: '.',
        },
        external: ['obsidian'],
      },
      emptyOutDir: false,
    },
  };
});
