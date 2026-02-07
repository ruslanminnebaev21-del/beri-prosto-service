FROM node:20-alpine

WORKDIR /app

# deps
COPY package.json package-lock.json ./
RUN npm ci

# build
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm","run","start","--","-p","3000","-H","0.0.0.0"]
