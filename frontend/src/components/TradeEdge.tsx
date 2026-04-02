import { memo } from 'react';
import { EdgeProps, getBezierPath } from '@xyflow/react';

function TradeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isBlockchain = (data as { pathType?: string })?.pathType === 'BLOCKCHAIN';
  const hasActiveTrade = ((data as { activeTrades?: number })?.activeTrades || 0) > 0;

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className={`trade-edge ${isBlockchain ? 'blockchain' : ''} ${selected ? 'selected' : ''}`}
        fill="none"
      />
      {hasActiveTrade && (
        <circle r="4" fill={isBlockchain ? 'var(--accent-primary)' : 'var(--amber)'}>
          <animateMotion
            dur="1s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </>
  );
}

export default memo(TradeEdge);
