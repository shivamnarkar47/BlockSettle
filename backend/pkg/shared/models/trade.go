package models

import (
	"time"

	"github.com/google/uuid"
)

type TradePath string

const (
	PathBlockchain  TradePath = "BLOCKCHAIN"
	PathTraditional TradePath = "TRADITIONAL"
)

type TradeStatus string

const (
	StatusPending           TradeStatus = "PENDING"
	StatusBrokerConfirmed   TradeStatus = "BROKER_CONFIRMED"
	StatusCCPCleared        TradeStatus = "CCP_CLEARED"
	StatusCSDSettled        TradeStatus = "CSD_SETTLED"
	StatusBlockchainReady   TradeStatus = "BLOCKCHAIN_READY"
	StatusBlockchainSettled TradeStatus = "BLOCKCHAIN_SETTLED"
	StatusFailed            TradeStatus = "FAILED"
)

type Trade struct {
	ID             uuid.UUID   `json:"id"`
	BuyerAddress   string      `json:"buyer_address"`
	SellerAddress  string      `json:"seller_address"`
	SecurityAmount int64       `json:"security_amount"`
	CashAmount     int64       `json:"cash_amount"`
	Status         TradeStatus `json:"status"`
	Path           TradePath   `json:"path"`
	TxHash         string      `json:"tx_hash,omitempty"`
	CreatedAt      time.Time   `json:"created_at"`
	SettledAt      *time.Time  `json:"settled_at,omitempty"`
}

type Wallet struct {
	ID         uuid.UUID `json:"id"`
	Address    string    `json:"address"`
	PrivateKey string    `json:"private_key,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type CreateTradeRequest struct {
	BuyerAddress   string `json:"buyer_address" binding:"required"`
	SellerAddress  string `json:"seller_address" binding:"required"`
	SecurityAmount int64  `json:"security_amount" binding:"required,gt=0"`
	CashAmount     int64  `json:"cash_amount" binding:"required,gt=0"`
	Path           string `json:"path" binding:"required,oneof=BLOCKCHAIN TRADITIONAL"`
}

type CreateWalletResponse struct {
	Address     string `json:"address"`
	SecurityBal int64  `json:"security_balance"`
	CashBal     int64  `json:"cash_balance"`
}

type SettlementEvent struct {
	ID          int       `json:"id"`
	TradeID     uuid.UUID `json:"trade_id"`
	TxHash      string    `json:"tx_hash"`
	BlockNumber int64     `json:"block_number"`
	EventType   string    `json:"event_type"`
	CreatedAt   time.Time `json:"created_at"`
}
