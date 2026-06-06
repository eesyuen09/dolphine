FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev

COPY backend ./backend
COPY algorithm/data ./algorithm/data

ENV HOST=0.0.0.0
ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

CMD ["npm", "--prefix", "backend", "start"]