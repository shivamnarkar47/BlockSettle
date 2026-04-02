import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TradeNode from './TradeNode';
import TradeEdge from './TradeEdge';
import { useTradeFlow } from '../hooks/useTradeFlow';
import { Activity } from 'lucide-react';

const nodeTypes = {
  tradeNode: TradeNode,
};

const edgeTypes = {
  tradeEdge: TradeEdge,
};

export default function TradeFlow() {
  const { nodes, edges, trades, isConnected } = useTradeFlow();

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node.id);
  }, []);

  const activeTrades = trades.filter(t => 
    !t.status.includes('SETTLED') && !t.status.includes('FAILED')
  ).length;

  return (
    <div className="trade-flow-panel">
      <div className="flow-header">
        <div className="flow-title">
          <Activity size={18} />
          <h3>Settlement Flow</h3>
          <span className="flow-badge">{activeTrades} active</span>
        </div>
        <div className={`flow-status ${isConnected ? 'connected' : ''}`}>
          <span className="status-dot" />
          <span>{isConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      <div className="flow-legend">
        <div className="legend-item">
          <span className="legend-dot traditional" />
          <span>Traditional T+2</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot blockchain" />
          <span>Blockchain</span>
        </div>
      </div>

      <div className="flow-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: 'tradeEdge',
            animated: true,
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
          <Controls className="flow-controls" />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as { pathType?: string };
              return data?.pathType === 'BLOCKCHAIN' ? 'var(--accent-primary)' : 'var(--amber)';
            }}
            maskColor="var(--bg-tertiary)"
            className="flow-minimap"
          />
        </ReactFlow>
      </div>

      {trades.length === 0 && (
        <div className="flow-empty">
          <p>No trades yet. Execute a trade to see the flow.</p>
        </div>
      )}
    </div>
  );
}
