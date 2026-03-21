import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7C3AED',
          light: '#A78BFA',
          dark: '#5B21B6',
        },
        income: '#059669',
        expense: '#DC2626',
        transfer: '#2563EB',
        warning: '#D97706',
        danger: '#DC2626',
        success: '#059669',
      },
      borderRadius: {
        card: '16px',
        chip: '10px',
        btn: '12px',
      },
      boxShadow: {
        card: '0 4px 12px rgba(0,0,0,0.07)',
        subtle: '0 2px 6px rgba(0,0,0,0.04)',
      },
      fontSize: {
        hero: ['36px', { fontWeight: '700', lineHeight: '1.1' }],
        'card-title': ['15px', { fontWeight: '600' }],
        'row-title': ['15px', { fontWeight: '500' }],
        caption: ['12px', { fontWeight: '400' }],
      },
      spacing: {
        'xxs': '4px',
        'xs': '8px',
        's': '12px',
        'm': '16px',
        'l': '20px',
        'xl': '24px',
        'xxl': '32px',
      },
    },
  },
  plugins: [],
}

export default config
