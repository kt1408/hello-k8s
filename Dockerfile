FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
