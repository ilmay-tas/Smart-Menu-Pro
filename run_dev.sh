#!/bin/bash

# Start Flask backend in the background
cd backend
python app.py &
FLASK_PID=$!

# Go back to root and start Vite frontend
cd ..
npx vite --host 0.0.0.0 --port 5000

# Cleanup Flask when Vite exits
kill $FLASK_PID
