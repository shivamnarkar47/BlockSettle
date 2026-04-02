package main

import (
	"fmt"
	"net/http"

	"settlement-simulator/pkg/shared/db"

	"github.com/gin-gonic/gin"
)

func main() {
	port := "8001"

	if err := db.InitDB(); err != nil {
		fmt.Printf("Failed to initialize database: %v\n", err)
	}

	router := gin.Default()
	router.Use(corsMiddleware())

	api := router.Group("/api")
	{
		api.POST("/orders", createOrder)
		api.GET("/orders/:id", getOrder)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"service": "broker", "status": "ok"})
		})
	}

	fmt.Printf("Broker Service running on port %s\n", port)
	router.Run(":" + port)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func createOrder(c *gin.Context) {
	var req struct {
		TradeID        string `json:"trade_id"`
		BuyerAddress   string `json:"buyer_address"`
		SellerAddress  string `json:"seller_address"`
		SecurityAmount int64  `json:"security_amount"`
		CashAmount     int64  `json:"cash_amount"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"trade_id": req.TradeID,
		"status":   "RECEIVED",
		"message":  "Order received by broker",
	})
}

func getOrder(c *gin.Context) {
	id := c.Param("id")

	var status string
	err := db.DB.QueryRow(`SELECT status FROM trades WHERE id = $1`, id).Scan(&status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"trade_id": id, "status": status})
}
