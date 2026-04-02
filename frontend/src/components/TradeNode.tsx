import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CircleDot, Building2, Shield, CheckCircle2, Zap } from 'lucide-react';

interface TradeNodeData {
  label: string;
  stage: string;
  trades: number;
  pathType?: 'TRADITIONAL' | 'BLOCKCHAIN';
}

interface CustomNodeProps {
  data: TradeNodeData;
  selected?: boolean;
}

const STAGE_ICONS: Record<string, typeof CircleDot> = {
  initiated: CircleDot,
  broker: Building2,
  ccp: Shield,
  csd: CheckCircle2,
  blockchain: Zap,
  settled: CheckCircle2,
};

const STAGE_LABELS: Record<string, string> = {
  initiated: 'Initiated',
  broker: 'Broker',
  ccp: 'CCP',
  csd: 'CSD',
  blockchain: 'Blockchain',
  settled: 'Settled',
};

function TradeNode({ data, selected }: CustomNodeProps) {
  const Icon = STAGE_ICONS[data.stage] || CircleDot;
  const label = data.label || STAGE_LABELS[data.stage] || data.stage;
  const isSettled = data.stage === 'settled';
  const isBlockchain = data.pathType === 'BLOCKCHAIN';

  return (
    <div className={`trade-node ${selected ? 'selected' : ''} ${isSettled ? 'settled' : ''} ${isBlockchain ? 'blockchain' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle" />
      
      <div className="node-content">
        <div className={`node-icon ${isBlockchain ? 'blockchain' : ''}`}>
          <Icon size={18} />
        </div>
        <div className="node-label">{label}</div>
        {data.trades > 0 && (
          <div className="trade-count">{data.trades}</div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  );
}

export default memo(TradeNode);
