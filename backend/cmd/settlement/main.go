package main

import (
	"fmt"
	"math/big"
	"net/http"
	"os"
	"time"

	"settlement-simulator/internal/blockchain"
	"settlement-simulator/internal/service"
	"settlement-simulator/pkg/shared/db"
	"settlement-simulator/pkg/shared/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	ws "github.com/gorilla/websocket"
)

var upgrader = ws.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var hub *service.Hub

func main() {
	port := getEnv("PORT", "8000")

	if err := db.InitDB(); err != nil {
		fmt.Printf("Failed to initialize database: %v\n", err)
		os.Exit(1)
	}
	defer db.CloseDB()

	bc, err := blockchain.NewClient("http://127.0.0.1:8545")
	if err != nil {
		fmt.Printf("Failed to initialize blockchain client: %v\n", err)
		fmt.Println("Note: Make sure Hardhat node is running (npm run node)")
	}

	if bc != nil {
		fmt.Printf("Blockchain client connected. Wallet: %s\n", bc.GetWalletAddress())
		cash, sec, set := bc.GetDeployedAddresses()
		fmt.Printf("Deployed contracts - Cash: %s, Security: %s, Settlement: %s\n", cash, sec, set)
	}

	hub = service.NewHub()
	go hub.Run()

	router := gin.Default()
	router.Use(corsMiddleware())

	router.GET("/ws", func(c *gin.Context) {
		serveWs(hub, c.Writer, c.Request)
	})

	api := router.Group("/api")
	{
		api.POST("/wallets", createWallet)
		api.GET("/wallets/:address/balance", getWalletBalance)
		api.POST("/trades", createTrade)
		api.GET("/trades/:id", getTrade)
		api.GET("/trades", listTrades)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})
	}

	fmt.Printf("Settlement Service running on port %s\n", port)
	router.Run(":" + port)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func createWallet(c *gin.Context) {
	walletAddr := getEnv("WALLET_ADDRESS", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")

	newUUID := uuid.New()
	_, err := db.DB.Exec(`
		INSERT INTO wallets (id, address, private_key, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (address) DO UPDATE SET address = EXCLUDED.address
	`, newUUID, walletAddr, "mock_private_key", time.Now())

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	bc, err := blockchain.GetClient()
	if err != nil {
		c.JSON(http.StatusOK, models.CreateWalletResponse{
			Address:     walletAddr,
			SecurityBal: 10000,
			CashBal:     1000000,
		})
		return
	}

	bc.MintCashToken(walletAddr, big.NewInt(1000000))
	bc.MintSecurityToken(walletAddr, big.NewInt(10000))

	cashAddr, secAddr, _ := bc.GetDeployedAddresses()
	cashBal, _ := bc.GetBalance(cashAddr, walletAddr)
	secBal, _ := bc.GetBalance(secAddr, walletAddr)

	c.JSON(http.StatusOK, models.CreateWalletResponse{
		Address:     walletAddr,
		SecurityBal: secBal.Int64(),
		CashBal:     cashBal.Int64(),
	})
}

func getWalletBalance(c *gin.Context) {
	address := c.Param("address")

	bc, err := blockchain.GetClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Blockchain client not available"})
		return
	}

	cashAddr, secAddr, _ := bc.GetDeployedAddresses()
	cashBal, _ := bc.GetBalance(cashAddr, address)
	secBal, _ := bc.GetBalance(secAddr, address)

	c.JSON(http.StatusOK, gin.H{
		"cash_balance":     cashBal.Int64(),
		"security_balance": secBal.Int64(),
	})
}

func createTrade(c *gin.Context) {
	var req models.CreateTradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tradeID := uuid.New()
	path := models.TradePath(req.Path)

	now := time.Now()
	_, err := db.DB.Exec(`
		INSERT INTO trades (id, buyer_address, seller_address, security_amount, cash_amount, status, path, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, tradeID, req.BuyerAddress, req.SellerAddress, req.SecurityAmount, req.CashAmount, models.StatusPending, path, now)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if path == models.PathBlockchain {
		go func() {
			time.Sleep(500 * time.Millisecond)

			bc, err := blockchain.GetClient()
			if err != nil {
				hub.Broadcast <- service.Message{Type: "error", TradeID: tradeID.String(), Content: "Blockchain client not available"}
				return
			}

			txHash, err := bc.SettleTrade(req.BuyerAddress, req.SellerAddress, big.NewInt(req.SecurityAmount), big.NewInt(req.CashAmount))
			if err != nil {
				db.DB.Exec(`UPDATE trades SET status = $1 WHERE id = $2`, models.StatusFailed, tradeID)
				hub.Broadcast <- service.Message{Type: "error", TradeID: tradeID.String(), Content: err.Error()}
				return
			}

			db.DB.Exec(`UPDATE trades SET status = $1, tx_hash = $2, settled_at = $3 WHERE id = $4`,
				models.StatusBlockchainSettled, txHash, time.Now(), tradeID)

			hub.Broadcast <- service.Message{
				Type:    "settled",
				TradeID: tradeID.String(),
				Content: fmt.Sprintf("Trade settled via blockchain. Tx: %s", txHash[:10]+"..."),
				TxHash:  txHash,
			}
		}()
	} else {
		go callBrokerService(tradeID.String(), req.BuyerAddress, req.SellerAddress, req.SecurityAmount, req.CashAmount)
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":      tradeID,
		"status":  models.StatusPending,
		"message": "Trade initiated",
		"path":    path,
	})
}

func callBrokerService(tradeID, buyer, seller string, securityAmt, cashAmt int64) {
	time.Sleep(100 * time.Millisecond)

	http.Post("http://localhost:8001/api/orders", "application/json", nil)
	time.Sleep(24 * time.Second)

	db.DB.Exec(`UPDATE trades SET status = $1 WHERE id = $2`, models.StatusBrokerConfirmed, tradeID)
	hub.Broadcast <- service.Message{Type: "status", TradeID: tradeID, Content: "Broker confirmed"}

	time.Sleep(24 * time.Second)

	db.DB.Exec(`UPDATE trades SET status = $1 WHERE id = $2`, models.StatusCCPCleared, tradeID)
	hub.Broadcast <- service.Message{Type: "status", TradeID: tradeID, Content: "CCP cleared"}

	time.Sleep(24 * time.Second)

	db.DB.Exec(`UPDATE trades SET status = $1, settled_at = $2 WHERE id = $3`, models.StatusCSDSettled, time.Now(), tradeID)
	hub.Broadcast <- service.Message{Type: "settled", TradeID: tradeID, Content: "Settlement complete (T+2)"}
}

func getTrade(c *gin.Context) {
	id := c.Param("id")

	var trade models.Trade
	err := db.DB.QueryRow(`
		SELECT id, buyer_address, seller_address, security_amount, cash_amount, status, path, tx_hash, created_at, settled_at
		FROM trades WHERE id = $1
	`, id).Scan(&trade.ID, &trade.BuyerAddress, &trade.SellerAddress, &trade.SecurityAmount, &trade.CashAmount,
		&trade.Status, &trade.Path, &trade.TxHash, &trade.CreatedAt, &trade.SettledAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trade not found"})
		return
	}

	c.JSON(http.StatusOK, trade)
}

func listTrades(c *gin.Context) {
	rows, err := db.DB.Query(`
		SELECT id, buyer_address, seller_address, security_amount, cash_amount, status, path, tx_hash, created_at, settled_at
		FROM trades ORDER BY created_at DESC LIMIT 50
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var trades []models.Trade
	for rows.Next() {
		var trade models.Trade
		rows.Scan(&trade.ID, &trade.BuyerAddress, &trade.SellerAddress, &trade.SecurityAmount, &trade.CashAmount,
			&trade.Status, &trade.Path, &trade.TxHash, &trade.CreatedAt, &trade.SettledAt)
		trades = append(trades, trade)
	}

	c.JSON(http.StatusOK, trades)
}

func serveWs(hub *service.Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("WebSocket upgrade error:", err)
		return
	}

	client := &service.Client{Hub: hub, Conn: conn, Send: make(chan []byte, 256)}
	client.Hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
