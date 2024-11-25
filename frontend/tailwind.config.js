/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", 
  ],
  theme: {
    extend: {
      keyframes:{
        slideLeft :{
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideRight :{
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation:{
        'slide-left': 'slideLeft 0.7s ease-in-out',
        'slide-right': 'slideRight 0.7s ease-in-out',
      }
    },
  },
  plugins: [
    require('tailwindcss-animated'),
  ]
  
};
