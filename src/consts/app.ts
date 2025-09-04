import { Space_Grotesk as SpaceGrotesk } from 'next/font/google';

export const MAIN_FONT = SpaceGrotesk({
  subsets: ['latin'],
  variable: '--font-main',
  preload: true,
  fallback: ['sans-serif'],
});
export const APP_NAME = 'Nym Bridge';
export const APP_DESCRIPTION = 'Bridge NYM tokens between Binance Smart Chain and Nym Network';
export const APP_URL = 'bridge.nym.com';
export const BRAND_COLOR = '#09B051'; // Nym primary green
export const BACKGROUND_COLOR = '#151515'; // Nym dark background
export const BACKGROUND_IMAGE = 'url(/backgrounds/main.svg)';

// Supported chains for Nym Bridge
export const SUPPORTED_CHAINS = {
  BSC: 'bsc',
  NYM: 'nym',
} as const;

export const CHAIN_DISPLAY_NAMES = {
  [SUPPORTED_CHAINS.BSC]: 'Binance',
  [SUPPORTED_CHAINS.NYM]: 'Nym Network',
} as const;
