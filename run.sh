#!/bin/bash

echo "Starting Securities Settlement Simulator..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill any existing processes on our ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "go run ./cmd/settlement" 2>/dev/null
pkill -f "go run ./cmd/broker" 2>/dev/null
pkill -f "go run ./cmd/ccp" 2>/dev/null
pkill -f "go run ./cmd/csd" 2>/dev/null
sleep 2

# Change to backend directory
cd "$(dirname "$0")/backend"

# Create SQLite database file
touch settlement.db

echo -e "${GREEN}Starting Settlement Service (port 8000)...${NC}"
CGO_ENABLED=1 go run ./cmd/settlement > /tmp/settlement.log 2>&1 &
SETTLEMENT_PID=$!
sleep 2

echo -e "${GREEN}Starting Broker Service (port 8001)...${NC}"
CGO_ENABLED=1 go run ./cmd/broker > /tmp/broker.log 2>&1 &
BROKER_PID=$!
sleep 1

echo -e "${GREEN}Starting CCP Service (port 8002)...${NC}"
CGO_ENABLED=1 go run ./cmd/ccp > /tmp/ccp.log 2>&1 &
CCP_PID=$!
sleep 1

echo -e "${GREEN}Starting CSD Service (port 8003)...${NC}"
CGO_ENABLED=1 go run ./cmd/csd > /tmp/csd.log 2>&1 &
CSD_PID=$!
sleep 2

# Check if services are running
echo -e "${YELLOW}Checking services...${NC}"
sleep 2

curl -s http://localhost:8000/api/health > /dev/null && echo -e "${GREEN}✓ Settlement Service (8000) running${NC}" || echo -e "${RED}✗ Settlement Service failed${NC}"
curl -s http://localhost:8001/api/health > /dev/null && echo -e "${GREEN}✓ Broker Service (8001) running${NC}" || echo -e "${RED}✗ Broker Service failed${NC}"
curl -s http://localhost:8002/api/health > /dev/null && echo -e "${GREEN}✓ CCP Service (8002) running${NC}" || echo -e "${RED}✗ CCP Service failed${NC}"
curl -s http://localhost:8003/api/health > /dev/null && echo -e "${GREEN}✓ CSD Service (8003) running${NC}" || echo -e "${RED}✗ CSD Service failed${NC}"

echo ""

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Securities Settlement Simulator Ready!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo "  Settlement:  http://localhost:8000"
echo "  Broker:      http://localhost:8001"
echo "  CCP:         http://localhost:8002"
echo "  CSD:         http://localhost:8003"
echo ""
echo "  To stop: pkill -f 'go run'"
echo ""

wait