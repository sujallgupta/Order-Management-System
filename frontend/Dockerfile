# Stage 1: Build React Application
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build args for frontend API injection
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Compile static assets
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:1.25-alpine

# Copy custom nginx conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output to Nginx serving directory
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
