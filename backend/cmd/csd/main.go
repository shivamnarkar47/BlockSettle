package main

import (
	"fmt"
	"net/http"

	"settlement-simulator/pkg/shared/db"

	"github.com/gin-gonic/gin"
)

func main() {
	port := "8003"

	if err := db.InitDB(); err != nil {
		fmt.Printf("Failed to initialize database: %v\n", err)
	}

	router := gin.Default()
	router.Use(corsMiddleware())

	api := router.Group("/api")
	{
		api.POST("/settlement", executeSettlement)
		api.GET("/settlement/:tradeId", getSettlementStatus)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"service": "csd", "status": "ok"})
		})
	}

	fmt.Printf("CSD Service running on port %s\n", port)
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

func executeSettlement(c *gin.Context) {
	var req struct {
		TradeID string `json:"trade_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"trade_id":         req.TradeID,
		"status":           "SETTLED",
		"securities_moved": true,
		"cash_moved":       true,
	})
}

func getSettlementStatus(c *gin.Context) {
	tradeId := c.Param("tradeId")

	var status string
	err := db.DB.QueryRow(`SELECT status FROM trades WHERE id = $1`, tradeId).Scan(&status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trade not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"trade_id": tradeId, "settlement_status": status})
}
