import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TableNode } from './TableNode'
import { layoutGraph } from '../layout/dagreLayout'
import type { SchemaPayload } from '../api/types'

const nodeTypes = { tableNode: TableNode }

interface DiagramCanvasProps {
  payload: SchemaPayload
  visibleIds: Set<string> | null
  onSelectNode?: (nodeId: string) => void
}

export function DiagramCanvas({ payload, visibleIds, onSelectNode }: DiagramCanvasProps) {
  const { nodes, edges } = useMemo(() => layoutGraph(payload), [payload])
  const filteredNodes = useMemo(
    () => (visibleIds ? nodes.filter((n) => visibleIds.has(n.id)) : nodes),
    [nodes, visibleIds],
  )
  const filteredEdges = useMemo(
    () =>
      edges.filter((e) => {
        const src = filteredNodes.find((n) => n.id === e.source)
        const tgt = filteredNodes.find((n) => n.id === e.target)
        return Boolean(src && tgt)
      }),
    [edges, filteredNodes],
  )

  const [rfNodes, setRfNodes] = useState<Node[]>(filteredNodes)
  const [rfEdges, setRfEdges] = useState<Edge[]>(filteredEdges)

  useEffect(() => {
    setRfNodes(filteredNodes)
    setRfEdges(filteredEdges)
  }, [filteredNodes, filteredEdges])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setRfNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setRfEdges((es) => applyEdgeChanges(changes, es)),
    [],
  )

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onSelectNode?.(node.id)}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#e2e8f0" gap={16} />
      <Controls />
      <MiniMap pannable zoomable nodeStrokeWidth={3} />
    </ReactFlow>
  )
}
