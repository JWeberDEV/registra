#!/bin/bash

echo "🔄 Parando processos na porta 5000..."

# Encontrar e matar processos na porta 5000
PID=$(lsof -ti:5000)

if [ ! -z "$PID" ]; then
    echo "📍 Processo encontrado na porta 5000 (PID: $PID)"
    kill -9 $PID
    echo "✅ Processo $PID finalizado"
    
    # Aguardar um momento para garantir que o processo foi encerrado
    sleep 2
    
    # Verificar se ainda há processos na porta
    REMAINING=$(lsof -ti:5000)
    if [ ! -z "$REMAINING" ]; then
        echo "⚠️  Ainda há processos na porta 5000, forçando encerramento..."
        kill -9 $REMAINING
        sleep 1
    fi
else
    echo "ℹ️  Nenhum processo encontrado na porta 5000"
fi

echo "🚀 Iniciando servidor..."
npm run dev