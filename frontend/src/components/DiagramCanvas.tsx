import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
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

export interface PanRequest {
  id: string
  ts: number
}

interface DiagramCanvasProps {
  payload: SchemaPayload
  visibleIds: Set<string> | null
  onSelectNode?: (nodeId: string) => void
  highlightId?: string | null
  panRequest?: PanRequest | null
}

export function DiagramCanvas({
  payload,
  visibleIds,
  onSelectNode,
  highlightId = null,
  panRequest = null,
}: DiagramCanvasProps) {
  const { nodes, edges } = useMemo(() => layoutGraph(payload), [payload])
  const filteredNodes = useMemo(
    () =>
      (visibleIds ? nodes.filter((n) => visibleIds.has(n.id)) : nodes).map((node) =>
        node.id === highlightId
          ? { ...node, data: { ...node.data, highlighted: true } }
          : node,
      ),
    [nodes, visibleIds, highlightId],
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
      <PanController request={panRequest} />
    </ReactFlow>
  )
}

function PanController({ request }: { request: PanRequest | null }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    if (request) {
      fitView({
        nodes: [{ id: request.id }],
        duration: 350,
        padding: 0.35,
        maxZoom: 1.3,
      })
    }
  }, [request, fitView])
  return null
}