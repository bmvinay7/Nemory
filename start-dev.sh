#!/bin/bash

echo "🚀 Starting Nemory Development Server"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_info "Checking project setup..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_status "Dependencies are installed"
fi

# Remove dist directory if it exists (can cause conflicts in development)
if [ -d "dist" ]; then
    print_warning "Removing dist directory (can cause development conflicts)"
    rm -rf dist
    print_status "Removed dist directory"
fi

# Remove Vite cache
if [ -d "node_modules/.vite" ]; then
    print_warning "Clearing Vite cache"
    rm -rf node_modules/.vite
    print_status "Vite cache cleared"
fi

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_warning ".env file not found. Copying from .env.example"
        cp .env.example .env
        print_status "Created .env file from example"
        print_warning "Please edit .env file with your actual configuration values"
    else
        print_warning "No .env file found. Some features may not work properly."
    fi
else
    print_status ".env file exists"
fi

# Find an available port
PORT=8080
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; do
    print_warning "Port $PORT is in use, trying $((PORT+1))"
    PORT=$((PORT+1))
done

print_status "Using port $PORT"

print_info "Starting development server..."
print_info "If you see a blank page, try:"
print_info "1. Clear browser cache completely (Ctrl+Shift+Delete)"
print_info "2. Open in incognito/private mode"
print_info "3. Clear service workers in DevTools → Application → Service Workers"

echo ""
print_info "Development server will start at: http://localhost:$PORT"
print_info "Press Ctrl+C to stop the server"
echo ""

# Start the development server with force flag and the available port
npm run dev -- --force --port $PORT