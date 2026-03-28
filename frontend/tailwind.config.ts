import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        harbor: {
          50: "#f4f7f7",
          100: "#d9e6e5",
          500: "#1b6b73",
          700: "#134d53"
        },
        sand: "#ede3cf"
      }
    }
  },
  plugins: []
};

export default config;

