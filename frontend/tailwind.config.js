/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        water: {
          deep: '#0E4A53',
          primary: '#0F766E',
          algae: '#16A085',
          aqua: '#2DD4BF',
          sky: '#38BDF8',
          bg: '#F4F8FA',
          mist: '#EEF6F7',
          ink: '#102A36',
          muted: '#60717A',
          border: '#DDE8EA'
        }
      },
      opacity: {
        8: '0.08',
        12: '0.12',
        14: '0.14',
        18: '0.18',
        24: '0.24',
        26: '0.26',
        32: '0.32',
        34: '0.34',
        35: '0.35',
        72: '0.72',
        74: '0.74',
        78: '0.78',
        94: '0.94'
      },
      boxShadow: {
        glow: '0 0 32px rgba(45, 212, 191, 0.25)'
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(10px, -8px, 0) scale(1.03)' }
        },
        cellPulse: {
          '0%, 100%': { opacity: '0.65', transform: 'scale(0.96)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' }
        }
      },
      animation: {
        drift: 'drift 8s ease-in-out infinite',
        cellPulse: 'cellPulse 2.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
