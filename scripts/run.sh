#!/bin/bash

# Script to run both NestJS (backend) and NextJS (frontend) applications
# Author: Vandyck

set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Configuration
NEXT_DIR="./frontend"  # Path to your Next.js application
NEST_DIR="./backend"   # Path to your Nest.js application
NEXT_PORT=3060         # Default Next.js port
NEST_PORT=3061         # Default Nest.js port
LOG_DIR="${SCRIPT_DIR}/logs"  # Directory for logs

# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR

# Function to check if a port is in use
is_port_in_use() {
    lsof -i:"$1" &> /dev/null
    return $?
}

# Function to find an available port
find_available_port() {
    local port=$1
    while is_port_in_use $port; do
        echo "Port $port is already in use. Trying next port..."
        ((port++))
    done
    echo $port
}

# Function to install dependencies for Next.js app
install_next_deps() {
    echo "Installing Next.js dependencies..."
    cd $NEXT_DIR
    npm i
    cd - > /dev/null
}

# Function to install dependencies for Nest.js app
install_nest_deps() {
    echo "Installing Nest.js dependencies..."
    cd $NEST_DIR
    npm i
    cd - > /dev/null
}

# Function to start Next.js app
start_next() {
    echo "Starting Next.js application on port $NEXT_PORT..."
    cd $NEXT_DIR
    PORT=$NEXT_PORT npm run dev > "${LOG_DIR}/next.log" 2>&1 &
    NEXT_PID=$!
    echo "Next.js started with PID: $NEXT_PID"
    cd - > /dev/null
}

# Function to start Nest.js app
start_nest() {
    echo "Starting Nest.js application on port $NEST_PORT..."
    cd $NEST_DIR
    PORT=$NEST_PORT npm run start:dev > "${LOG_DIR}/nest.log" 2>&1 &
    NEST_PID=$!
    echo "Nest.js started with PID: $NEST_PID"
    cd - > /dev/null
}

# Function to stop all apps
stop_apps() {
    echo "Stopping applications..."
    if [ -n "$NEXT_PID" ]; then
        kill $NEXT_PID 2>/dev/null || true
        echo "Next.js stopped"
    fi
    if [ -n "$NEST_PID" ]; then
        kill $NEST_PID 2>/dev/null || true
        echo "Nest.js stopped"
    fi
    
    # Kill any remaining processes on these ports
    lsof -ti:$NEXT_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$NEST_PORT | xargs kill -9 2>/dev/null || true
    
    exit 0
}

# Set up trap to handle script termination
trap stop_apps INT TERM

# Check if both directories exist
if [ ! -d "$NEXT_DIR" ]; then
    echo "Error: Next.js directory not found at $NEXT_DIR"
    exit 1
fi

if [ ! -d "$NEST_DIR" ]; then
    echo "Error: Nest.js directory not found at $NEST_DIR"
    exit 1
fi

# Install dependencies for both applications
install_next_deps
install_nest_deps

# Start both applications
start_next
start_nest

# Display information
echo ""
echo "Applications running:"
echo "Next.js: http://localhost:$NEXT_PORT"
echo "Nest.js: http://localhost:$NEST_PORT"
echo ""
echo "Logs are being saved to the $LOG_DIR directory"
echo "Press Ctrl+C to stop all applications"

# Keep script running
wait