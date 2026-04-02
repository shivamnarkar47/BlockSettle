package blockchain

import (
	"fmt"
	"math/big"
	"os"
	"sync"
	"time"
)

var (
	deployedAddrs = struct {
		CashToken     string
		SecurityToken string
		Settlement    string
	}{
		CashToken:     "0x5FbDB2315678afecb367f032d93F642f64180aa3",
		SecurityToken: "0x5FbDB2315678afecb367f032d93F642f64180aa4",
		Settlement:    "0x5FbDB2315678afecb367f032d93F642f64180aa5",
	}
	clientInstance *Client
	balances       = make(map[string]map[string]*big.Int)
	mu             sync.RWMutex
)

type Client struct {
	mu         sync.Mutex
	walletAddr string
}

func init() {
	balances = make(map[string]map[string]*big.Int)
}

func NewClient(rpcURL string) (*Client, error) {
	if clientInstance != nil {
		return clientInstance, nil
	}

	walletAddr := getEnv("WALLET_ADDRESS", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
	fmt.Printf("Mock blockchain client initialized with wallet: %s\n", walletAddr)

	loadDeployedAddresses()

	clientInstance = &Client{
		walletAddr: walletAddr,
	}

	return clientInstance, nil
}

func loadDeployedAddresses() {
	data, err := os.ReadFile("/home/vagabond/Documents/Projects/Blockchian-Securities-Settlement-Simulator/contracts/deployments.json")
	if err != nil {
		fmt.Println("Using default mock addresses")
		return
	}

	var config struct {
		CashToken     string `json:"cashToken"`
		SecurityToken string `json:"securityToken"`
		Settlement    string `json:"settlement"`
	}
	fmt.Sscanf(string(data), "%s %s %s", &config.CashToken, &config.SecurityToken, &config.Settlement)
	_ = config
}

func GetClient() (*Client, error) {
	if clientInstance == nil {
		return NewClient("http://127.0.0.1:8545")
	}
	return clientInstance, nil
}

func (c *Client) GetWalletAddress() string {
	return c.walletAddr
}

func (c *Client) MintCashToken(to string, amount *big.Int) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	time.Sleep(100 * time.Millisecond)

	if balances[to] == nil {
		balances[to] = make(map[string]*big.Int)
	}
	if balances[to]["cash"] == nil {
		balances[to]["cash"] = big.NewInt(0)
	}
	balances[to]["cash"].Add(balances[to]["cash"], amount)

	txHash := fmt.Sprintf("0x%x", time.Now().UnixNano())
	fmt.Printf("[MINT] Cash: %s +%s to %s\n", txHash[:10], amount.String(), to[:10])
	return txHash, nil
}

func (c *Client) MintSecurityToken(to string, amount *big.Int) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	time.Sleep(100 * time.Millisecond)

	if balances[to] == nil {
		balances[to] = make(map[string]*big.Int)
	}
	if balances[to]["security"] == nil {
		balances[to]["security"] = big.NewInt(0)
	}
	balances[to]["security"].Add(balances[to]["security"], amount)

	txHash := fmt.Sprintf("0x%x", time.Now().UnixNano())
	fmt.Printf("[MINT] Security: %s +%s to %s\n", txHash[:10], amount.String(), to[:10])
	return txHash, nil
}

func (c *Client) SettleTrade(buyer, seller string, securityAmount, cashAmount *big.Int) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	time.Sleep(500 * time.Millisecond)

	buyerBal := balances[buyer]
	sellerBal := balances[seller]

	if buyerBal == nil || buyerBal["cash"] == nil || buyerBal["cash"].Cmp(cashAmount) < 0 {
		return "", fmt.Errorf("insufficient cash balance")
	}
	if sellerBal == nil || sellerBal["security"] == nil || sellerBal["security"].Cmp(securityAmount) < 0 {
		return "", fmt.Errorf("insufficient security balance")
	}

	buyerBal["cash"].Sub(buyerBal["cash"], cashAmount)
	buyerBal["security"].Add(buyerBal["security"], securityAmount)

	sellerBal["security"].Sub(sellerBal["security"], securityAmount)
	sellerBal["cash"].Add(sellerBal["cash"], cashAmount)

	txHash := fmt.Sprintf("0x%x", time.Now().UnixNano())
	fmt.Printf("[SETTLE] Trade: %s buyer->%s seller->%s\n", txHash[:10], buyer[:10], seller[:10])

	return txHash, nil
}

func (c *Client) GetBalance(tokenAddr, owner string) (*big.Int, error) {
	mu.RLock()
	defer mu.RUnlock()

	if balances[owner] == nil {
		return big.NewInt(0), nil
	}

	if tokenAddr == deployedAddrs.CashToken || tokenAddr == "cash" {
		cash := balances[owner]["cash"]
		if cash == nil {
			return big.NewInt(0), nil
		}
		return cash, nil
	}

	security := balances[owner]["security"]
	if security == nil {
		return big.NewInt(0), nil
	}
	return security, nil
}

func (c *Client) GetDeployedAddresses() (cash, security, settlement string) {
	return deployedAddrs.CashToken, deployedAddrs.SecurityToken, deployedAddrs.Settlement
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func SetBalance(address string, tokenType string, amount *big.Int) {
	mu.Lock()
	defer mu.Unlock()

	if balances[address] == nil {
		balances[address] = make(map[string]*big.Int)
	}
	balances[address][tokenType] = amount
}
