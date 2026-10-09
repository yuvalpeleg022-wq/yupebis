import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// The built site is written to ../avengers-doomsday so GitHub Pages and Netlify
// can serve it as a static folder. base "./" keeps asset paths relative.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: { outDir: "../avengers-doomsday", emptyOutDir: true },
})
