'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MerkleNode {
  hash: string;
  isProof: boolean;
  isLeaf: boolean;
  level: number;
  x?: number;
  y?: number;
}

interface MerklePathVisualizerProps {
  merkleProof: string[];
  leafHash: string;
  merkleRoot: string;
  className?: string;
}

export function MerklePathVisualizer({
  merkleProof,
  leafHash,
  merkleRoot,
  className,
}: MerklePathVisualizerProps) {
  const canvasRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<MerkleNode[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate visual representation of merkle tree path
  useEffect(() => {
    const generatedNodes: MerkleNode[] = [];

    // Add leaf node
    generatedNodes.push({
      hash: leafHash.slice(0, 12),
      isProof: true,
      isLeaf: true,
      level: merkleProof.length,
    });

    // Add proof nodes
    merkleProof.forEach((hash, index) => {
      generatedNodes.push({
        hash: hash.slice(0, 12),
        isProof: true,
        isLeaf: false,
        level: merkleProof.length - index - 1,
      });
    });

    // Add root
    generatedNodes.push({
      hash: merkleRoot.slice(0, 12),
      isProof: false,
      isLeaf: false,
      level: 0,
    });

    setNodes(generatedNodes);
  }, [merkleProof, leafHash, merkleRoot]);

  const nodeHeight = 60;
  const nodeWidth = 180;
  const verticalGap = 80;
  const svgHeight = nodes.length * (nodeHeight + verticalGap) + 40;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="rounded-lg bg-card border border-border p-4 overflow-x-auto">
        <svg
          ref={canvasRef}
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${nodeWidth + 100} ${svgHeight}`}
          className="min-w-full"
        >
          {/* Draw connections */}
          {nodes.map((node, index) => {
            if (index < nodes.length - 1) {
              const y1 = 30 + index * (nodeHeight + verticalGap) + nodeHeight / 2;
              const y2 = 30 + (index + 1) * (nodeHeight + verticalGap) + nodeHeight / 2;
              return (
                <line
                  key={`connection-line-${index}`}
                  x1={nodeWidth / 2 + 50}
                  y1={y1}
                  x2={nodeWidth / 2 + 50}
                  y2={y2}
                  stroke={node.isProof ? '#00ff87' : '#4a5078'}
                  strokeWidth="2"
                  strokeDasharray={node.isProof ? '0' : '4'}
                />
              );
            }
            return null;
          })}

          {/* Draw nodes */}
          {nodes.map((node, index) => (
            <motion.g
              key={`merkle-node-${index}-${node.hash}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Node box */}
              <rect
                x={50}
                y={30 + index * (nodeHeight + verticalGap)}
                width={nodeWidth}
                height={nodeHeight}
                rx="8"
                fill={node.isProof ? 'rgba(0, 255, 135, 0.1)' : 'rgba(45, 52, 84, 0.5)'}
                stroke={node.isProof ? '#00ff87' : '#4a5078'}
                strokeWidth="2"
                className={cn('cursor-pointer transition-all', hoveredIndex === index && 'stroke-secondary')}
              />

              {/* Node label */}
              <text
                x={50 + nodeWidth / 2}
                y={30 + index * (nodeHeight + verticalGap) + 25}
                textAnchor="middle"
                className="text-xs font-mono fill-foreground"
                pointerEvents="none"
              >
                {node.isLeaf ? 'Leaf' : `Level ${node.level}`}
              </text>

              {/* Node hash */}
              <text
                x={50 + nodeWidth / 2}
                y={30 + index * (nodeHeight + verticalGap) + 50}
                textAnchor="middle"
                className={cn('text-xs font-mono', node.isProof ? 'fill-accent' : 'fill-muted-foreground')}
                pointerEvents="none"
              >
                {node.hash}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span className="text-muted-foreground">Proof Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted" />
          <span className="text-muted-foreground">Merkle Root</span>
        </div>
      </div>
    </div>
  );
}
