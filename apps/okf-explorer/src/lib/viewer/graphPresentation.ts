export type GraphPoint = { x: number; y: number };
export type GraphBox = { x: number; y: number; w: number; h: number };
export type GraphLabelAnchor = 'start' | 'end' | 'middle';

export type GraphLabelPlacement = {
  x: number;
  y: number;
  anchor: GraphLabelAnchor;
  text: string;
  box: GraphBox;
};

export type GraphLabelItem = {
  id: string;
  priority: number;
  always?: boolean;
  choices: GraphLabelPlacement[];
};

export type GraphObstacle = {
  id: string;
  box: GraphBox;
};

export type VisibleGraphLabel = GraphLabelPlacement & {
  stable: boolean;
};

export type GraphLabelLayerPlan = {
  visible: Map<string, VisibleGraphLabel>;
  stableIds: string[];
  layers: string[][];
  layerCount: number;
  activeLayer: number;
};

export type DirectedGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type DirectedEdgePlan = {
  id: string;
  showLabel: boolean;
  labelT: number;
  bend: number;
};

export type GraphEdgeGeometry = {
  d: string;
  labelX: number;
  labelY: number;
};

export function boxesOverlap(left: GraphBox, right: GraphBox): boolean {
  return left.x < right.x + right.w
    && left.x + left.w > right.x
    && left.y < right.y + right.h
    && left.y + left.h > right.y;
}

function overlapCount(box: GraphBox, boxes: GraphBox[]): number {
  return boxes.reduce((count, candidate) => count + Number(boxesOverlap(box, candidate)), 0);
}

function choosePlacement(
  item: GraphLabelItem,
  obstacles: GraphObstacle[],
  persistentBoxes: GraphBox[],
  placedBoxes: GraphBox[]
): GraphLabelPlacement | null {
  if (!item.choices.length) return null;
  const nodeBoxes = obstacles.filter((obstacle) => obstacle.id !== item.id).map((obstacle) => obstacle.box);
  const candidates = item.choices.map((choice, index) => {
    const persistentOverlaps = overlapCount(choice.box, persistentBoxes);
    const nodeOverlaps = overlapCount(choice.box, nodeBoxes);
    const labelOverlaps = overlapCount(choice.box, placedBoxes);
    return {
      choice,
      score: persistentOverlaps * 1_000_000 + nodeOverlaps * 10_000 + labelOverlaps * 100 + index
    };
  });
  candidates.sort((left, right) => left.score - right.score);
  return candidates[0]?.choice || null;
}

/**
 * Places every supplied label, keeps selected labels persistent, and partitions
 * only the remaining collisions into complete non-overlapping display layers.
 */
export function planGraphLabelLayers(
  items: GraphLabelItem[],
  obstacles: GraphObstacle[],
  phase = 0
): GraphLabelLayerPlan {
  const ordered = [...items].sort((left, right) => {
    if (Boolean(left.always) !== Boolean(right.always)) return left.always ? -1 : 1;
    return left.priority - right.priority || left.id.localeCompare(right.id);
  });
  const placements = new Map<string, GraphLabelPlacement>();
  const alwaysIds = new Set(ordered.filter((item) => item.always).map((item) => item.id));
  const persistentBoxes: GraphBox[] = [];
  const placedBoxes: GraphBox[] = [];

  for (const item of ordered) {
    const placement = choosePlacement(item, obstacles, persistentBoxes, placedBoxes);
    if (!placement) continue;
    placements.set(item.id, placement);
    placedBoxes.push(placement.box);
    if (item.always) persistentBoxes.push(placement.box);
  }

  const candidates = ordered
    .filter((item) => placements.has(item.id) && !alwaysIds.has(item.id))
    .map((item) => ({ item, placement: placements.get(item.id)! }));
  const stableIds: string[] = [];
  const rotating: typeof candidates = [];

  for (const candidate of candidates) {
    const conflictsWithAlways = persistentBoxes.some((box) => boxesOverlap(candidate.placement.box, box));
    const conflictsWithLabel = candidates.some((other) => (
      other.item.id !== candidate.item.id
      && boxesOverlap(candidate.placement.box, other.placement.box)
    ));
    if (conflictsWithAlways || conflictsWithLabel) rotating.push(candidate);
    else stableIds.push(candidate.item.id);
  }

  const layers: Array<typeof rotating> = [];
  for (const candidate of rotating) {
    const layer = layers.find((itemsInLayer) => (
      !itemsInLayer.some((other) => boxesOverlap(candidate.placement.box, other.placement.box))
      && !persistentBoxes.some((box) => boxesOverlap(candidate.placement.box, box))
    ));
    if (layer) layer.push(candidate);
    else layers.push([candidate]);
  }

  const layerCount = Math.max(1, layers.length);
  const activeLayer = ((phase % layerCount) + layerCount) % layerCount;
  const visible = new Map<string, VisibleGraphLabel>();
  for (const id of alwaysIds) {
    const placement = placements.get(id);
    if (placement) visible.set(id, { ...placement, stable: true });
  }
  for (const id of stableIds) {
    const placement = placements.get(id);
    if (placement) visible.set(id, { ...placement, stable: true });
  }
  for (const candidate of layers[activeLayer] || []) {
    visible.set(candidate.item.id, { ...candidate.placement, stable: false });
  }

  return {
    visible,
    stableIds,
    layers: layers.map((layer) => layer.map((candidate) => candidate.item.id)),
    layerCount,
    activeLayer
  };
}

function unorderedPairKey(source: string, target: string): string {
  return source < target ? `${source}\u0000${target}` : `${target}\u0000${source}`;
}

/**
 * Separates reciprocal arrows. Equal reciprocal labels are shown once; distinct
 * labels sit nearer their own source so direction remains legible.
 */
export function planDirectedEdges(edges: DirectedGraphEdge[]): Map<string, DirectedEdgePlan> {
  const groups = new Map<string, DirectedGraphEdge[]>();
  for (const edge of edges) {
    const key = unorderedPairKey(edge.source, edge.target);
    const group = groups.get(key) || [];
    group.push(edge);
    groups.set(key, group);
  }

  const plan = new Map<string, DirectedEdgePlan>();
  for (const group of groups.values()) {
    const directions = new Set(group.map((edge) => `${edge.source}\u0000${edge.target}`));
    const reciprocal = directions.size > 1;
    const labels = new Set(group.map((edge) => edge.label));
    const ordered = [...group].sort((left, right) => left.id.localeCompare(right.id));

    ordered.forEach((edge, index) => {
      const showOnce = reciprocal && labels.size === 1;
      const parallelOffset = reciprocal ? 24 : (index - (ordered.length - 1) / 2) * 18;
      plan.set(edge.id, {
        id: edge.id,
        showLabel: !showOnce || index === 0,
        labelT: reciprocal && labels.size > 1 ? 0.34 : 0.5,
        bend: parallelOffset
      });
    });
  }
  return plan;
}

export function quadraticEdgeGeometry(
  source: GraphPoint,
  target: GraphPoint,
  sourcePad = 28,
  targetPad = sourcePad,
  bend = 0,
  labelT = 0.5
): GraphEdgeGeometry {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const sourceTrim = Math.min(sourcePad, length / 3);
  const targetTrim = Math.min(targetPad, length / 3);
  const start = { x: source.x + ux * sourceTrim, y: source.y + uy * sourceTrim };
  const end = { x: target.x - ux * targetTrim, y: target.y - uy * targetTrim };
  const control = {
    x: (start.x + end.x) / 2 - uy * bend,
    y: (start.y + end.y) / 2 + ux * bend
  };
  const t = Math.max(0.2, Math.min(0.8, labelT));
  const u = 1 - t;
  return {
    d: `M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`,
    labelX: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    labelY: u * u * start.y + 2 * u * t * control.y + t * t * end.y - 7
  };
}
