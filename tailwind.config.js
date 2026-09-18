/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      },
      colors: {
        ink: {
          950: '#0B1220',
          900: '#0F172A',
          800: '#16213A',
          700: '#212F4D'
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F7FA',
          border: '#E4E8F0'
        },
        signal: {
          DEFAULT: '#0E7C86',
          light: '#E4F4F3',
          dark: '#0A5F67'
        },
        accent: {
          DEFAULT: '#2563EB',
          light: '#EAF1FE'
        },
        amber: {
          DEFAULT: '#D97706',
          light: '#FDF1E3'
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FCEAEA'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 1px rgba(15, 23, 42, 0.04)'
      }
    }
  },
  plugins: []
}
