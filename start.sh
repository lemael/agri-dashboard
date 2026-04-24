#!/bin/bash
# Script pour démarrer le backend ET le frontend en une seule commande

echo "🌱 Facilitar Dashboard — Démarrage..."

# Backend
echo "📡 Démarrage backend (port 3001)..."
cd "$(dirname "$0")/backend" && node server.js &
BACKEND_PID=$!

sleep 1
echo "✅ Backend démarré (PID: $BACKEND_PID)"

# Frontend
echo "🖥️  Démarrage frontend (port 5173)..."
cd "$(dirname "$0")/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  Backend  → http://localhost:3001"
echo "  Frontend → http://localhost:5173"
echo "========================================"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter..."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '👋 Arrêt.'" INT
wait
