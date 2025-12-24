# Build Stage
FROM node:24-alpine

WORKDIR /app

# Add network resilience settings for npm
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-maxtimeout 60000

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]