'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Shield, Fingerprint, Database, Network } from 'lucide-react';

interface MerkleNode {
  hash: string;
  isProof: boolean;
  isLeaf: boolean;
  level: number;
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
  const [nodes, setNodes] = useState<MerkleNode[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const generatedNodes: MerkleNode[] = [];

    // Add leaf node
    generatedNodes.push({
      hash: leafHash,
      isProof: true,
      isLeaf: true,
      level: merkleProof.length,
    });

    // Add proof nodes
    merkleProof.forEach((hash, index) => {
      generatedNodes.push({
        hash: hash,
        isProof: true,
        isLeaf: false,
        level: merkleProof.length - index - 1,
      });
    });

    // Add root
    generatedNodes.push({
      hash: merkleRoot,
      isProof: false,
      isLeaf: false,
      level: 0,
    });

    setNodes(generatedNodes);
  }, [merkleProof, leafHash, merkleRoot]);

  const nodeHeight = 70;
  const nodeWidth = 240;
  const verticalGap = 100;
  const svgHeight = nodes.length * (nodeHeight + verticalGap);

  return (
    <div className={cn('flex flex-col h-full bg-accent/5 rounded-2xl p-6 border border-border/50 relative overflow-hidden', className)}>
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#808080_1px,transparent_1px)] bg-[size:30px_30px]" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto pr-4 custom-scrollbar">
        <svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 400 ${svgHeight}`}
          className="min-w-full"
        >
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Draw paths first (so they go behind nodes) */}
          <AnimatePresence>
            {nodes.map((node, index) => {
              if (index < nodes.length - 1) {
                const y1 = index * (nodeHeight + verticalGap) + nodeHeight;
                const y2 = (index + 1) * (nodeHeight + verticalGap);
                const x = 200;

                return (
                  <motion.path
                    key={`path-${index}`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                    d={`M ${x} ${y1} L ${x} ${y2}`}
                    stroke="url(#line-gradient)"
                    strokeWidth="3"
                    strokeDasharray={node.isProof ? "none" : "6,6"}
                    fill="none"
                    filter="url(#glow)"
                  />
                );
              }
              return null;
            })}
          </AnimatePresence>

          {/* Draw nodes */}
          {nodes.map((node, index) => {
            const y = index * (nodeHeight + verticalGap);
            const x = 200 - nodeWidth / 2;

            return (
              <motion.g
                key={`node-${index}`}
                initial={{ opacity: 0, y: y + 20 }}
                animate={{ opacity: 1, y: y }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Visual Connector Pulse */}
                {node.isProof && (
                  <motion.circle
                    cx="200"
                    cy={index * (nodeHeight + verticalGap) + nodeHeight / 2}
                    r="40"
                    fill="var(--accent)"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 0.1, 0], scale: [0.8, 1.5, 0.8] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    pointerEvents="none"
                  />
                )}

                <rect
                  x={x}
                  y="0"
                  width={nodeWidth}
                  height={nodeHeight}
                  rx="16"
                  fill="var(--card)"
                  stroke={node.isProof ? "var(--accent)" : "var(--border)"}
                  strokeWidth="2"
                  className={cn(
                    "transition-all duration-300",
                    hoveredIndex === index ? "stroke-accent fill-accent/5" : "opacity-90"
                  )}
                />

                {/* Icon based on type */}
                <foreignObject x={x + 12} y="15" width="40" height="40">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    {node.isLeaf ? (
                      <Fingerprint className="w-5 h-5 text-accent" />
                    ) : index === nodes.length - 1 ? (
                      <Shield className="w-5 h-5 text-accent" />
                    ) : (
                      <Network className="w-5 h-5 text-accent" />
                    )}
                  </div>
                </foreignObject>

                <text
                  x={x + 65}
                  y="35"
                  className="fill-muted-foreground text-[10px] font-black uppercase tracking-widest"
                >
                  {node.isLeaf ? "Client Leaf" : index === nodes.length - 1 ? "Merkle Root" : `L${node.level} Hash Node`}
                </text>

                <text
                  x={x + 65}
                  y="55"
                  className="fill-foreground font-mono text-xs font-bold"
                >
                  {node.hash.slice(0, 16)}...
                </text>

                {/* Hover indicator */}
                {hoveredIndex === index && (
                  <motion.text
                    layoutId="tooltip"
                    x={x + nodeWidth + 10}
                    y="40"
                    className="fill-accent text-[8px] font-black uppercase"
                  >
                    Verified Path
                  </motion.text>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
