FROM node:20-alpine

WORKDIR /app

# Create config directory for mounted files
RUN mkdir -p /app/config

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

ARG NODE_ENV

# Install all dependencies, including devDependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 3000
EXPOSE 3000

# Use npm run dev for development with nodemon
CMD ["npm", "run", "dev"]