
FROM node:23.8.0

WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Europe/Paris

COPY package*.json ./
RUN npm install -g pnpm
RUN pnpm install --quiet --only=production

COPY . .

CMD ["pnpm", "start"]