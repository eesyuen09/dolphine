/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sea: {
          foam: "#E9F7F2",
          mist: "#F5FBF8",
          glass: "#D9F2EC",
          teal: "#0E8F87",
          deep: "#075D67",
          ink: "#102B33"
        },
        sand: "#FFF6E7",
        coral: "#F36F5F"
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Manrope", "Helvetica Neue", "sans-serif"]
      },
      boxShadow: {
        soft: "0 24px 80px rgba(16, 43, 51, 0.11)",
        card: "0 16px 50px rgba(16, 43, 51, 0.08)"
      },
      backgroundImage: {
        "ocean-radial": "radial-gradient(circle at 20% 20%, rgba(14, 143, 135, 0.18), transparent 34%), radial-gradient(circle at 82% 12%, rgba(243, 111, 95, 0.13), transparent 28%), linear-gradient(135deg, #F8FFFC 0%, #EAF7F5 52%, #FFF6E7 100%)"
      },
      animation: {
        "soft-float": "soft-float 8s ease-in-out infinite",
        "rise-in": "rise-in 0.7s ease-out both",
        shimmer: "shimmer 1.5s linear infinite"
      },
      keyframes: {
        "soft-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" }
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        }
      }
    }
  },
  plugins: []
};
