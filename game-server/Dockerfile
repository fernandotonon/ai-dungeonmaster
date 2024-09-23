# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# If we have any build scripts, run them here
# RUN npm run build

# Production stage
FROM node:20-alpine

# Set node environment to production
ENV NODE_ENV production

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy built node modules and built assets from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app .

# Expose port 3000
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]