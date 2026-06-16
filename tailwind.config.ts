import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#151515",
        ember: "#d94f2b",
        moss: "#5d7a43",
        tide: "#267d99",
        sun: "#f2b84b",
      },
      boxShadow: {
        card: "0 18px 40px rgba(21, 21, 21, 0.12)",
      },
    },
  },
  plugins: [],
}

export default config
