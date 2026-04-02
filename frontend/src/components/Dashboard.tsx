import { useState, useEffect } from 'react';
import './Dashboard.css';
import { 
  Wallet, 
  ArrowRightLeft, 
  Clock, 
  Zap, 
  Activity, 
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  Layers,
  ArrowLeft
} from 'lucide-react';
import TradeFlow from './TradeFlow';

interface Trade {
  id: string;
  buyer_address: string;
  seller_address: string;
  security_amount: number;
  cash_amount: number;
  status: string;
  path: string;
  tx_hash?: string;
  created_at: string;
  settled_at?: string;
}

interface Wallet {
  address: string;
  cash_balance: number;
  security_balance: number;
}

interface Message {
  type: string;
  trade_id?: string;
  content: string;
  tx_hash?: string;
}

interface DashboardProps {
  onBack: () => void;
}

const MOCK_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const STATUS_STEPS = {
  TRADITIONAL: [
    { key: 'PENDING', label: 'Initiated', icon: CircleDot },
    { key: 'BROKER_CONFIRMED', label: 'Broker', icon: Activity },
    { key: 'CCP_CLEARED', label: 'CCP', icon: CheckCircle2 },
    { key: 'CSD_SETTLED', label: 'Settled', icon: CheckCircle2 },
  ],
  BLOCKCHAIN: [
    { key: 'BLOCKCHAIN_READY', label: 'Initiated', icon: CircleDot },
    { key: 'BLOCKCHAIN_CONFIRMED', label: 'Confirmed', icon: Activity },
    { key: 'BLOCKCHAIN_SETTLED', label: 'Settled', icon: CheckCircle2 },
  ]
};

function Dashboard({ onBack }: DashboardProps) {
  const [_wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<string>("");
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [securityAmount, setSecurityAmount] = useState<number>(10);
  const [cashAmount, setCashAmount] = useState<number>(1000);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [blockchainTrade, setBlockchainTrade] = useState<Trade | null>(null);
  const [traditionalTrade, setTraditionalTrade] = useState<Trade | null>(null);
  const [blockchainTimer, setBlockchainTimer] = useState<number>(0);
  const [traditionalTimer, setTraditionalTimer] = useState<number>(0);
  const [showFlowView, setShowFlowView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    createWallet();
    fetchTrades();
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');

    ws.onopen = () => {
      setIsConnected(true);
      addLog('Connected to Settlement Service');
    };

    ws.onmessage = (event) => {
      const msg: Message = JSON.parse(event.data);
      addLog(`${msg.content}`);
      fetchTrades();
    };

    ws.onclose = () => {
      setIsConnected(false);
      addLog('Disconnected');
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (trades.length > 0) {
      setBlockchainTrade(prev => {
        if (prev) {
          const updated = trades.find(t => t.id === prev.id);
          return updated ? { ...prev, ...updated } : prev;
        }
        return prev;
      });
      setTraditionalTrade(prev => {
        if (prev) {
          const updated = trades.find(t => t.id === prev.id);
          return updated ? { ...prev, ...updated } : prev;
        }
        return prev;
      });
    }
  }, [trades]);

  useEffect(() => {
    let interval: number;
    if (blockchainTrade && blockchainTrade.status !== 'BLOCKCHAIN_SETTLED' && blockchainTrade.status !== 'FAILED') {
      interval = window.setInterval(() => {
        setBlockchainTimer(t => {
          if (blockchainTrade.status === 'BLOCKCHAIN_SETTLED') return 0;
          return t + 1;
        });
      }, 1000);
    } else {
      setBlockchainTimer(0);
    }
    return () => clearInterval(interval);
  }, [blockchainTrade, blockchainTrade?.status]);

  useEffect(() => {
    let interval: number;
    if (traditionalTrade && traditionalTrade.status !== 'CSD_SETTLED' && traditionalTrade.status !== 'FAILED') {
      interval = window.setInterval(() => {
        setTraditionalTimer(t => {
          if (traditionalTrade.status === 'CSD_SETTLED') return 0;
          return t + 1;
        });
      }, 1000);
    } else {
      setTraditionalTimer(0);
    }
    return () => clearInterval(interval);
  }, [traditionalTrade, traditionalTrade?.status]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `${time} - ${message}`]);
  };

  const createWallet = async () => {
    try {
      const res = await fetch('/api/wallets', { method: 'POST' });
      const data = await res.json();
      setWallets([{ address: data.address, cash_balance: data.cash_balance, security_balance: data.security_balance }]);
      setSelectedBuyer(data.address);
      setSelectedSeller(data.address);
      addLog(`Wallet: ${data.address.slice(0, 10)}...`);
    } catch (err) {
      console.error('Failed to create wallet:', err);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades');
      const data = await res.json();
      setTrades(data || []);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    }
  };

  const executeTrade = async (path: string) => {
    if (path === 'BLOCKCHAIN' && (!selectedBuyer || !selectedSeller)) {
      addLog('Select buyer and seller');
      return;
    }

    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_address: selectedBuyer || MOCK_WALLET,
          seller_address: selectedSeller || MOCK_WALLET,
          security_amount: securityAmount,
          cash_amount: cashAmount,
          path: path
        })
      });
      const data = await res.json();
      addLog(`Trade: ${data.id.slice(0, 8)} via ${path}`);

      if (path === 'BLOCKCHAIN') {
        setBlockchainTrade({ ...data, status: 'BLOCKCHAIN_READY' });
      } else {
        setTraditionalTrade({ ...data, status: 'PENDING' });
      }
      setTraditionalTimer(0);
      setBlockchainTimer(0);
      fetchTrades();
    } catch (err) {
      console.error('Failed to execute trade:', err);
      addLog('Trade failed');
    }
  };

  const getStepIndex = (status: string, path: string) => {
    const steps = path === 'BLOCKCHAIN' ? STATUS_STEPS.BLOCKCHAIN : STATUS_STEPS.TRADITIONAL;
    return steps.findIndex(s => s.key === status);
  };

  const getStepStatus = (stepIndex: number, currentIndex: number) => {
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getTraditionalProgress = () => {
    if (!traditionalTrade) return 0;
    if (traditionalTrade.status === 'CSD_SETTLED') return 100;
    const stepIndex = getStepIndex(traditionalTrade.status, 'TRADITIONAL');
    if (stepIndex < 0) return 0;
    return ((stepIndex + 1) / STATUS_STEPS.TRADITIONAL.length) * 100;
  };

  const getBlockchainProgress = () => {
    if (!blockchainTrade) return 0;
    if (blockchainTrade.status === 'BLOCKCHAIN_SETTLED') return 100;
    const stepIndex = getStepIndex(blockchainTrade.status, 'BLOCKCHAIN');
    if (stepIndex < 0) return 0;
    return ((stepIndex + 1) / STATUS_STEPS.BLOCKCHAIN.length) * 100;
  };

  const completedTrades = trades.filter(t => t.status.includes('SETTLED')).length;
  const traditionalCount = trades.filter(t => t.path === 'TRADITIONAL').length;
  const blockchainCount = trades.filter(t => t.path === 'BLOCKCHAIN').length;

  return (
    <div className={`dashboard ${isLoaded ? 'loaded' : ''}`}>
      <header className="dash-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack} aria-label="Exit to landing page">
            <ArrowLeft size={18} />
            <span>Exit</span>
          </button>
          <div className="logo-section">
            <div className="logo-icon">
              <Activity size={22} />
            </div>
            <div className="logo-text">
              <h1>Settlement Simulator</h1>
              <p>Compare T+2 vs Real-Time</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="connection-status" data-connected={isConnected} aria-live="polite" aria-label="Connection status">
            <span className="status-dot" />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <div className="stats-mini">
            <div className="mini-stat">
              <span className="mini-value">{trades.length}</span>
              <span className="mini-label">Trades</span>
            </div>
            <div className="mini-stat success">
              <span className="mini-value">{completedTrades}</span>
              <span className="mini-label">Settled</span>
            </div>
          </div>
        </div>
      </header>

      <main className="dash-main">
        <div className="trade-cards">
          <div className={`trade-card traditional ${isLoaded ? 'visible' : ''}`}>
            <div className="card-glow" />
            <div className="card-header">
              <div className="card-icon traditional">
                <Clock size={24} />
              </div>
              <div>
                <h2>Traditional</h2>
                <span className="badge amber">T+2 Settlement</span>
              </div>
            </div>
            
            <div className="progress-section">
              <div className="progress-track">
                <div 
                  className="progress-fill traditional"
                  style={{ width: `${traditionalTrade ? getTraditionalProgress() : 0}%` }}
                />
              </div>
              <div className="progress-steps">
                {STATUS_STEPS.TRADITIONAL.map((step, idx) => {
                  const currentIdx = getStepIndex(traditionalTrade?.status || 'PENDING', 'TRADITIONAL');
                  const status = getStepStatus(idx, currentIdx);
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className={`step ${status}`}>
                      <div className="step-icon">
                        <Icon size={14} />
                      </div>
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                if (traditionalTrade?.status === 'CSD_SETTLED') {
                  setTraditionalTrade(null);
                }
                executeTrade('TRADITIONAL');
              }}
              aria-label="Execute traditional settlement trade"
              className="btn traditional"
            >
              <span>{traditionalTrade?.status === 'CSD_SETTLED' ? 'New Trade' : 'Execute T+2'}</span>
              <ArrowRightLeft size={18} />
            </button>

            <div className="status-display">
              <span className="label">Status</span>
              <span className={`value ${getStatusColor(traditionalTrade?.status || 'IDLE')}`}>
                {traditionalTrade?.status || 'Ready'}
              </span>
            </div>

            {traditionalTimer > 0 && (
              <div className="risk-display danger">
                <AlertTriangle size={16} />
                <div>
                  <span className="risk-label">At Risk</span>
                  <span className="risk-value">${(traditionalTimer * 20).toLocaleString()}</span>
                </div>
              </div>
            )}

            {traditionalTrade?.status === 'CSD_SETTLED' && (
              <div className="settled-badge" role="status" aria-live="polite">
                <CheckCircle2 size={14} />
                <span>Settled</span>
              </div>
            )}
          </div>

          <div className={`trade-card blockchain ${isLoaded ? 'visible' : ''}`} style={{ animationDelay: '0.1s' }}>
            <div className="card-glow" />
            <div className="card-header">
              <div className="card-icon blockchain">
                <Zap size={24} />
              </div>
              <div>
                <h2>Blockchain</h2>
                <span className="badge emerald">Real-Time</span>
              </div>
            </div>
            
            <div className="progress-section">
              <div className="progress-track">
                <div 
                  className="progress-fill blockchain"
                  style={{ width: `${blockchainTrade ? getBlockchainProgress() : 0}%` }}
                />
              </div>
              <div className="progress-steps">
                {STATUS_STEPS.BLOCKCHAIN.map((step, idx) => {
                  const currentIdx = getStepIndex(blockchainTrade?.status || 'IDLE', 'BLOCKCHAIN');
                  const status = getStepStatus(idx, currentIdx);
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className={`step ${status}`}>
                      <div className="step-icon">
                        <Icon size={14} />
                      </div>
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                if (blockchainTrade?.status === 'BLOCKCHAIN_SETTLED') {
                  setBlockchainTrade(null);
                }
                executeTrade('BLOCKCHAIN');
              }}
              aria-label="Execute blockchain settlement trade"
              className="btn blockchain"
            >
              <span>{blockchainTrade?.status === 'BLOCKCHAIN_SETTLED' ? 'New Trade' : 'Execute'}</span>
              <Zap size={18} />
            </button>

            <div className="status-display">
              <span className="label">Status</span>
              <span className={`value ${getStatusColor(blockchainTrade?.status || 'IDLE')}`}>
                {blockchainTrade?.status || 'Ready'}
              </span>
            </div>

            <div className="risk-display success" role="status" aria-live="polite">
              <CheckCircle2 size={16} />
              <div>
                <span className="risk-label">Risk</span>
                <span className="risk-value">
                  {blockchainTrade?.status === 'BLOCKCHAIN_SETTLED' ? '$0' : 
                   blockchainTrade ? '~$0' : '$0'}
                </span>
              </div>
            </div>

            {blockchainTrade?.status === 'BLOCKCHAIN_SETTLED' && (
              <div className="settled-badge" role="status" aria-live="polite">
                <CheckCircle2 size={14} />
                <span>Settled</span>
              </div>
            )}
          </div>
        </div>

        <div className="controls-section">
          <div className="input-group">
            <label htmlFor="security-amount">Security Amount</label>
            <input
              id="security-amount"
              type="number"
              value={securityAmount}
              onChange={(e) => setSecurityAmount(Number(e.target.value))}
              className="input"
              aria-label="Security amount"
            />
          </div>
          <div className="input-group">
            <label htmlFor="cash-amount">Cash Amount</label>
            <input
              id="cash-amount"
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(Number(e.target.value))}
              className="input"
              aria-label="Cash amount"
            />
          </div>
          <div className="input-group stats-group">
            <label>Total Trades</label>
            <div className="stat-value">{trades.length}</div>
          </div>
          <div className="input-group stats-group">
            <label>Traditional</label>
            <div className="stat-value amber">{traditionalCount}</div>
          </div>
          <div className="input-group stats-group">
            <label>Blockchain</label>
            <div className="stat-value emerald">{blockchainCount}</div>
          </div>
          <div className="input-group" style={{ alignSelf: 'end' }}>
            <button 
              className={`view-toggle ${showFlowView ? 'active' : ''}`}
              onClick={() => setShowFlowView(!showFlowView)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowFlowView(!showFlowView); }}
              aria-pressed={showFlowView}
              aria-label={showFlowView ? 'Switch to table view' : 'Switch to flow view'}
            >
              <Layers size={16} />
              <span>{showFlowView ? 'Table View' : 'Flow View'}</span>
            </button>
          </div>
        </div>

        {showFlowView && <TradeFlow />}

        <div className="bottom-section">
          <div className="logs-section">
            <div className="section-header">
              <Activity size={18} />
              <h3>Activity</h3>
            </div>
            <div className="logs-container" role="log" aria-label="Activity log" aria-live="polite">
              {logs.map((log, i) => (
                <div key={`log-${i}-${log.slice(0, 8)}`} className="log-entry">{log}</div>
              ))}
            </div>
          </div>

          <div className="trades-section">
            <div className="section-header">
              <Wallet size={18} />
              <h3>Recent Trades</h3>
            </div>
            <div className="table-container">
              <table role="grid" aria-label="Recent trades">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Path</th>
                    <th scope="col">Security</th>
                    <th scope="col">Cash</th>
                    <th scope="col">Status</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 8).map((trade) => (
                    <tr key={trade.id}>
                      <td className="mono">{trade.id.slice(0, 8)}</td>
                      <td>
                        <span className={`path-badge ${trade.path.toLowerCase()}`}>
                          {trade.path}
                        </span>
                      </td>
                      <td>{trade.security_amount}</td>
                      <td>${trade.cash_amount.toLocaleString()}</td>
                      <td className={getStatusColor(trade.status)}>{trade.status}</td>
                      <td className="muted">{new Date(trade.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function getStatusColor(status: string) {
  if (status.includes('SETTLED')) return 'success';
  if (status.includes('CLEARED') || status.includes('CONFIRMED')) return 'info';
  if (status.includes('FAILED')) return 'error';
  return 'muted';
}

export default Dashboard;