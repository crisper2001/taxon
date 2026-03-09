# Stage 1: Build stage
FROM node:20-slim AS build

WORKDIR /app

# Accept the API key as a build argument
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Build the application
# The GEMINI_API_KEY env var will be picked up by vite.config.ts during build
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine

# Copy the build output from the build stage to nginx's serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
