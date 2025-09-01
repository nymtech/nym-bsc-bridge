/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme');
const defaultColors = require('tailwindcss/colors');

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['var(--font-main)'],
      serif: ['Garamond', 'serif'],
      mono: ['Courier New', 'monospace'],
    },
    screens: {
      all: '1px',
      xs: '480px',
      ...defaultTheme.screens,
    },
    extend: {
      colors: {
        black: '#000000',
        white: '#FFFFFF',
        // Nym Primary Greens
        'nym-green': {
          primary: '#09B051',
          dark: '#013218',
          light: '#7CF9B1',
          lighter: '#D9FFE8',
        },
        // Nym Grays / Neutrals
        'nym-gray': {
          darkest: '#242628',
          dark: '#424648',
          medium: '#818A8F',
          light: '#ABB2B5',
          lighter: '#CED2D3',
          lightest: '#E5E7E8',
        },
        // Nym Blues
        'nym-blue': {
          dark: '#2C2D3A',
          medium: '#585B7B',
          light: '#959BBF',
          lighter: '#DAE0EB',
          lightest: '#F4F7FB',
        },
        // Nym Accent/Status
        'nym-accent': {
          cyan: '#7A9596',
        },
        'nym-status': {
          success: '#00CA33',
          warning: '#F9BE2B',
          error: '#DF1400',
        },
        // Legacy colors for compatibility
        gray: { ...defaultColors.gray, '150': '#EBEDF0', '250': '#404040', '350': '#6B6B6B' },
        primary: {
          50: '#D9FFE8', // Light Nym green
          100: '#B3F2C7',
          200: '#8EE6A6',
          300: '#69D985',
          400: '#44CD64',
          500: '#09B051', // Nym primary green
          600: '#089146',
          700: '#06723A',
          800: '#04542F',
          900: '#033524',
        },
        accent: {
          50: '#D9FFE8', // Light Nym green
          100: '#B3F2C7',
          200: '#8EE6A6',
          300: '#69D985',
          400: '#44CD64',
          500: '#09B051', // Nym primary green
          600: '#089146',
          700: '#06723A',
          800: '#04542F',
          900: '#033524',
        },
        red: {
          100: '#EBBAB8',
          200: '#DF8D8A',
          300: '#D25F5B',
          400: '#C5312C',
          500: '#DF1400', // Nym error red
          600: '#AB1812',
          700: '#85120E',
          800: '#5F0D0A',
          900: '#390806',
        },
        green: {
          50: '#D9FFE8', // Nym green lighter
          100: '#BED5C9',
          200: '#93BAA6',
          300: '#679F82',
          400: '#3C835E',
          500: '#09B051', // Nym primary green
          600: '#236A45',
          700: '#1F5E3D',
          800: '#17462E',
          900: '#013218', // Nym green dark
        },
      },
      fontSize: {
        xxs: '0.7rem',
        xs: '0.775rem',
        sm: '0.85rem',
        md: '0.95rem',
      },
      spacing: {
        88: '22rem',
        100: '26rem',
        112: '28rem',
        128: '32rem',
        144: '36rem',
      },
      borderRadius: {
        none: '0',
        sm: '0.20rem',
        DEFAULT: '0.30rem',
        md: '0.40rem',
        lg: '0.50rem',
        full: '9999px',
      },
      blur: {
        xs: '3px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;',
      },
      transitionProperty: {
        height: 'height, max-height',
        spacing: 'margin, padding',
      },
      maxWidth: {
        'xl-1': '39.5rem',
      },
    },
  },
  plugins: [],
};
