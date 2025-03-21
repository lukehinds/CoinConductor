#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
  echo "Shutting down servers..."
  kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
  exit 0
}

# Set up trap to catch SIGINT (Ctrl+C)
trap cleanup SIGINT

# Start the backend server
echo "Starting backend server..."
cd backend
source venv/bin/activate
python run.py &
BACKEND_PID=$!
cd ..

# Wait a moment for the backend to initialize
sleep 2

# Start the frontend server
echo "Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Both servers are running!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "Press Ctrl+C to stop both servers."

# Wait for both processes
wait $FRONTEND_PID $BACKEND_PID