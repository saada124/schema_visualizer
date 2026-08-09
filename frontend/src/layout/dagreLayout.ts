import dagre from 'dagre'
import type { Edge, Node } from '@xyflow/react'
import type { SchemaPayload, SchemaEdge, SchemaNode } from '../api/types'

export interface TableNodeData extends Record<string, unknown> {
  table: SchemaNode
}

export const TABLE_WIDTH = 220
export const ROW_HEIGHT = 24
export const HEADER_HEIGHT = 36

function nodeHeight(columns: number): number {
  return HEADER_HEIGHT + columns * ROW_HEIGHT + 8
}

function buildGraph(payload: SchemaPayload) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 })
  for (const node of payload.nodes) {
    g.setNode(node.id, { width: TABLE_WIDTH, height: nodeHeight(node.columns.length) })
  }
  for (const edge of payload.edges) {
    if (edge.source === edge.target) continue
    if (!g.hasNode(edge.source) || !g.hasNode(edge.target)) continue
    g.setEdge(edge.source, edge.target)
  }
  dagre.layout(g)
  return g
}

export function layoutGraph(payload: SchemaPayload) {
  const g = buildGraph(payload)
  const nodes: Node<TableNodeData>[] = payload.nodes.map((table) => {
    const pos = g.node(table.id)
    return {
      id: table.id,
      type: 'tableNode',
      position: { x: pos.x - TABLE_WIDTH / 2, y: pos.y - nodeHeight(table.columns.length) / 2 },
      data: { table },
    }
  })
  const edges: Edge[] = payload.edges.map((e) => edgeToFlow(e))
  return { nodes, edges }
}

function edgeToFlow(e: SchemaEdge): Edge {
  const label =
    e.sourceColumns.join(',') === e.targetColumns.join(',')
      ? undefined
      : `${e.sourceColumns.join(',')} -> ${e.targetColumns.join(',')}`
  return {
    id: `${e.source}:${e.target}:${e.sourceColumns.join('+')}`,
    source: e.source,
    target: e.target,
    label,
    type: 'default',
    style: { strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: '#64748b' },
  }
}
