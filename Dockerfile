# Use official Node.js 22 LTS image
FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build:railway

EXPOSE 3000

CMD ["node", "server.js"]
