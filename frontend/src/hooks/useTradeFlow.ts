import { useState, useEffect, useCallback, useMemo } from 'react';
import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

export interface Trade {
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

const STAGE_MAP: Record<string, string> = {
  PENDING: 'initiated',
  BLOCKCHAIN_READY: 'blockchain',
  BROKER_CONFIRMED: 'broker',
  CCP_CLEARED: 'ccp',
  CSD_SETTLED: 'settled',
  BLOCKCHAIN_SETTLED: 'settled',
  FAILED: 'settled',
};

const TRADITIONAL_STAGES = ['initiated', 'broker', 'ccp', 'settled'];
const BLOCKCHAIN_STAGES = ['initiated', 'blockchain', 'settled'];

interface NodeData {
  stage: string;
  trades: number;
  pathType?: 'TRADITIONAL' | 'BLOCKCHAIN';
  label: string;
}

interface EdgeData {
  pathType?: 'TRADITIONAL' | 'BLOCKCHAIN';
  activeTrades?: number;
}

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 120, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 60,
        y: nodeWithPosition.y - 40,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function useTradeFlow() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch('/api/trades');
      const data = await res.json();
      setTrades(data || []);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    }
  }, []);

  useEffect(() => {
    fetchTrades();

    const ws = new WebSocket('ws://localhost:8000/ws');

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'status' || msg.type === 'settled' || msg.type === 'error') {
        fetchTrades();
      }
    };

    return () => ws.close();
  }, [fetchTrades]);

  const { nodes, edges } = useMemo(() => {
    const recentTrades = trades.slice(0, 10);
    
    const stageCounts: Record<string, Record<string, number>> = {
      initiated: { TRADITIONAL: 0, BLOCKCHAIN: 0 },
      broker: { TRADITIONAL: 0, BLOCKCHAIN: 0 },
      ccp: { TRADITIONAL: 0, BLOCKCHAIN: 0 },
      csd: { TRADITIONAL: 0, BLOCKCHAIN: 0 },
      blockchain: { TRADITIONAL: 0, BLOCKCHAIN: 0 },
      settled: { TRADITIONAL: 0, BLOCKCHAIN: 0 },
    };

    recentTrades.forEach((trade) => {
      const stage = STAGE_MAP[trade.status] || 'initiated';
      const pathType = trade.path as 'TRADITIONAL' | 'BLOCKCHAIN';
      if (stageCounts[stage]) {
        stageCounts[stage][pathType]++;
      }
    });

    const stageNodes: Node[] = [
      { id: 'initiated', type: 'tradeNode', position: { x: 0, y: 100 }, data: { stage: 'initiated', trades: recentTrades.length, label: 'Initiated' } },
      { id: 'broker', type: 'tradeNode', position: { x: 0, y: 0 }, data: { stage: 'broker', trades: stageCounts.broker.TRADITIONAL, pathType: 'TRADITIONAL' as const, label: 'Broker' } },
      { id: 'blockchain', type: 'tradeNode', position: { x: 0, y: 200 }, data: { stage: 'blockchain', trades: stageCounts.blockchain.BLOCKCHAIN, pathType: 'BLOCKCHAIN' as const, label: 'Blockchain' } },
      { id: 'ccp', type: 'tradeNode', position: { x: 0, y: 0 }, data: { stage: 'ccp', trades: stageCounts.ccp.TRADITIONAL, pathType: 'TRADITIONAL' as const, label: 'CCP' } },
      { id: 'csd', type: 'tradeNode', position: { x: 0, y: 0 }, data: { stage: 'csd', trades: stageCounts.csd.TRADITIONAL, pathType: 'TRADITIONAL' as const, label: 'CSD' } },
      { id: 'settled', type: 'tradeNode', position: { x: 0, y: 0 }, data: { stage: 'settled', trades: stageCounts.settled.TRADITIONAL + stageCounts.settled.BLOCKCHAIN, label: 'Settled' } },
    ];

    const stageEdges: Edge[] = [
      { id: 'e1', source: 'initiated', target: 'broker', type: 'tradeEdge', data: { pathType: 'TRADITIONAL' as const, activeTrades: 0 } },
      { id: 'e2', source: 'initiated', target: 'blockchain', type: 'tradeEdge', data: { pathType: 'BLOCKCHAIN' as const, activeTrades: 0 } },
      { id: 'e3', source: 'broker', target: 'ccp', type: 'tradeEdge', data: { pathType: 'TRADITIONAL' as const, activeTrades: 0 } },
      { id: 'e4', source: 'ccp', target: 'csd', type: 'tradeEdge', data: { pathType: 'TRADITIONAL' as const, activeTrades: 0 } },
      { id: 'e5', source: 'csd', target: 'settled', type: 'tradeEdge', data: { pathType: 'TRADITIONAL' as const, activeTrades: 0 } },
      { id: 'e6', source: 'blockchain', target: 'settled', type: 'tradeEdge', data: { pathType: 'BLOCKCHAIN' as const, activeTrades: 0 } },
    ];

    recentTrades.forEach((trade) => {
      const stage = STAGE_MAP[trade.status] || 'initiated';
      const pathType = trade.path;
      
      if (pathType === 'BLOCKCHAIN') {
        const stages = BLOCKCHAIN_STAGES;
        stages.forEach((s, idx) => {
          if (idx < stages.length - 1) {
            const edge = stageEdges.find(e => 
              e.source === s && e.target === stages[idx + 1] && (e.data as EdgeData)?.pathType === 'BLOCKCHAIN'
            );
            if (edge && stage === s) {
              edge.data = { ...edge.data, activeTrades: ((edge.data as EdgeData)?.activeTrades || 0) + 1 };
            }
          }
        });
      } else {
        const stages = TRADITIONAL_STAGES;
        stages.forEach((s, idx) => {
          if (idx < stages.length - 1) {
            const edge = stageEdges.find(e => 
              e.source === s && e.target === stages[idx + 1] && (e.data as EdgeData)?.pathType === 'TRADITIONAL'
            );
            if (edge && stage === s) {
              edge.data = { ...edge.data, activeTrades: ((edge.data as EdgeData)?.activeTrades || 0) + 1 };
            }
          }
        });
      }
    });

    const visibleNodes = stageNodes.filter((n) => {
      return n.id !== 'initiated';
    });
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const visibleEdges = stageEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

    return getLayoutedElements(visibleNodes, visibleEdges);
  }, [trades]);

  return { nodes, edges, trades, isConnected, fetchTrades };
}
