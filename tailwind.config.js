/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      keyframes: {
        /* Кастомная анимация для колокольчика */
        ring: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '10%': { transform: 'rotate(15deg)' },
          '20%': { transform: 'rotate(-15deg)' },
          '30%': { transform: 'rotate(10deg)' },
          '40%': { transform: 'rotate(-10deg)' },
          '50%': { transform: 'rotate(5deg)' },
          '60%': { transform: 'rotate(-5deg)' },
        }
      },
      animation: {
        ring: 'ring 0.8s ease-in-out',
      }
    }
  },
  plugins: [],
}

