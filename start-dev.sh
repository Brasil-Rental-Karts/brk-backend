#!/bin/bash

# Start PostgreSQL in Docker
echo "Starting PostgreSQL and PgAdmin in Docker..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Start the development server
echo "Starting the development server..."
npm run dev 