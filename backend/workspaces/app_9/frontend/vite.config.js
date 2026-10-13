import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En développement local, /api est redirigé vers le backend (port 5000).
// En production (Docker), c'est nginx qui fait ce travail.
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": "http://localhost:5000"
        }
    }
});
