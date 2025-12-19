# Multi-stage build for GeoAlbum

# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM golang:1.23-alpine AS backend
WORKDIR /app
RUN apk add --no-cache gcc musl-dev
COPY go.mod go.sum ./
RUN go mod download
COPY backend/ ./backend/
COPY main.go ./
COPY --from=frontend /app/frontend/dist ./frontend/dist
RUN CGO_ENABLED=1 go build -o geoalbum .

# Stage 3: Runtime
FROM alpine:latest
RUN apk --no-cache add ca-certificates sqlite tzdata
WORKDIR /app
RUN mkdir -p data
COPY --from=backend /app/geoalbum .
EXPOSE 8080
CMD ["./geoalbum"]