import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f4f4f0",
        surface: "#ffffff",
        primary: "#ff5900",
        text: "#111111",
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #111111',
        'brutal-lg': '6px 6px 0px 0px #111111',
        'brutal-hover': '2px 2px 0px 0px #111111',
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
      borderColor: {
        DEFAULT: '#111111',
      }
    },
  },
  plugins: [],
};
export default config;
