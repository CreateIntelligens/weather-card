# Backend Dockerfile for NanoBanana Studio
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Expose port
EXPOSE 3001

# Start the server with nodemon for hot reload
CMD ["npm", "start"]
