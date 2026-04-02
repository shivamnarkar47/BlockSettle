package db

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() error {
	dbPath := getEnv("DB_PATH", "./settlement.db")

	var err error
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	fmt.Println("Connected to SQLite database:", dbPath)
	return initTables()
}

func initTables() error {
	schema := `
	CREATE TABLE IF NOT EXISTS wallets (
		id TEXT PRIMARY KEY,
		address TEXT UNIQUE NOT NULL,
		private_key TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS trades (
		id TEXT PRIMARY KEY,
		buyer_address TEXT NOT NULL,
		seller_address TEXT NOT NULL,
		security_amount INTEGER NOT NULL,
		cash_amount INTEGER NOT NULL,
		status TEXT NOT NULL,
		path TEXT NOT NULL,
		tx_hash TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		settled_at DATETIME
	);

	CREATE TABLE IF NOT EXISTS settlement_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		trade_id TEXT,
		tx_hash TEXT,
		block_number INTEGER,
		event_type TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
	CREATE INDEX IF NOT EXISTS idx_trades_path ON trades(path);
	`

	_, err := DB.Exec(schema)
	return err
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func CloseDB() {
	if DB != nil {
		DB.Close()
	}
}
