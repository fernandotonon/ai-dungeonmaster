FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 3000

# Use npm start for development
CMD ["npm", "start"]