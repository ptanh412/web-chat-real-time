/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        slideLeft: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        spinnerRing: {
          '0%': { strokeDasharray: '0 257 0 0 1 0 0 258' },
          '25%': { strokeDasharray: '0 0 0 0 257 0 258 0' },
          '50%, 100%': { strokeDasharray: '0 0 0 0 0 515 0 0' }
        },
        spinnerBall: {
          '0%, 50%': {
            strokeDashoffset: '1'
          },
          '64%': {
            strokeDashoffset: '-109'
          },
          '78%': {
            strokeDashoffset: '-145'
          },
          '92%': {
            strokeDashoffset: '-157'
          },
          '57%, 71%, 85%, 99%, 100%': {
            strokeDashoffset: '-163'
          }
        }
      },
      animation: {
        'slide-left': 'slideLeft 0.7s ease-in-out',
        'slide-right': 'slideRight 0.7s ease-in-out',
        'slide-down': 'slideDown 1s ease-out forwards',
        'spinner-ring': 'spinnerRing 2s ease-out infinite',
        'spinner-ball': 'spinnerBall 10s ease-out infinite'
      },
      gridAutoRows: {
        'min': 'minmax(0, 1fr)'
      }
    }
  },
  plugins: [
    require('tailwindcss-animated'),
    require('tailwind-scrollbar')
  ],
  variants: {
    extend: {
      scrollbar: ['dark', 'rounded']
    }
  }
};