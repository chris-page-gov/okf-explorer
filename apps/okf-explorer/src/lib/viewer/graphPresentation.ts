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

export type GroupableGraphEdge = DirectedGraphEdge & {
  predicate?: string;
  assertionStatus?: string;
  assertionScope?: string;
  authorityClass?: string;
};

export type GraphSemanticFilters = {
  assertionStatuses?: string[];
  assertionScopes?: string[];
  authorityClasses?: string[];
};

export type GraphRelationshipDirection = 'outgoing' | 'incoming' | 'lateral';
export type GraphRelationshipSide = 'left' | 'top' | 'bottom' | 'right';

export type GraphRelationshipGroup = {
  key: string;
  label: string;
  predicate: string;
  direction: GraphRelationshipDirection;
  assertionStatuses: string[];
  assertionScopes: string[];
  authorityClasses: string[];
  edgeIds: string[];
  nodeIds: string[];
};

export type GraphRelationshipSlot = {
  side: GraphRelationshipSide;
  lane: number;
};

export type GraphRelationshipLayoutPlan = {
  positions: Map<string, GraphPoint>;
  slots: Map<string, GraphRelationshipSlot>;
  nodeSlots: Map<string, GraphRelationshipSlot>;
};

export function shouldUseRelationshipLayout(
  center: string,
  groupCount: number,
  relationshipCount: number,
  forced = false
): boolean {
  if (!center || groupCount < 1) return false;
  return forced || relationshipCount >= 4;
}

export type GraphEdgeWeightInput = {
  id: string;
  metrics: Record<string, number | undefined>;
};

export type GraphEdgeWeightPlan = {
  active: boolean;
  metric: string;
  min: number;
  max: number;
  widths: Map<string, number>;
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
  placedBoxes: GraphBox[],
  futureItems: GraphLabelItem[] = []
): GraphLabelPlacement | null {
  if (!item.choices.length) return null;
  const nodeBoxes = obstacles.filter((obstacle) => obstacle.id !== item.id).map((obstacle) => obstacle.box);
  const candidates = item.choices.map((choice, index) => {
    const persistentOverlaps = overlapCount(choice.box, persistentBoxes);
    const nodeOverlaps = overlapCount(choice.box, nodeBoxes);
    const labelOverlaps = overlapCount(choice.box, placedBoxes);
    const futureLabelsBlocked = futureItems.filter((future) => (
      future.choices.length > 0
      && future.choices.every((candidate) => boxesOverlap(choice.box, candidate.box))
    )).length;
    return {
      choice,
      score:
        persistentOverlaps * 1_000_000
        + futureLabelsBlocked * 100_000
        + nodeOverlaps * 10_000
        + labelOverlaps * 100
        + index
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

  for (const [index, item] of ordered.entries()) {
    const placement = choosePlacement(
      item,
      obstacles,
      persistentBoxes,
      placedBoxes,
      item.always ? ordered.slice(index + 1) : []
    );
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

function relationshipDirection(edge: GroupableGraphEdge, center: string): GraphRelationshipDirection {
  if (center && edge.source === center) return 'outgoing';
  if (center && edge.target === center) return 'incoming';
  return 'lateral';
}

export function graphRelationshipGroupKey(edge: GroupableGraphEdge, center: string): string {
  const predicate = edge.predicate?.trim() || edge.label.trim() || 'related';
  return `${relationshipDirection(edge, center)}:${predicate}`;
}

export function filterGraphRelationshipsBySemantics(
  edges: GroupableGraphEdge[],
  filters: GraphSemanticFilters
): GroupableGraphEdge[] {
  const statuses = new Set(filters.assertionStatuses || []);
  const scopes = new Set(filters.assertionScopes || []);
  const authorities = new Set(filters.authorityClasses || []);
  return edges.filter((edge) => (
    (!statuses.size || statuses.has(edge.assertionStatus || 'unclassified'))
    && (!scopes.size || scopes.has(edge.assertionScope || 'unclassified'))
    && (!authorities.size || authorities.has(edge.authorityClass || 'unclassified'))
  ));
}

/**
 * Groups a focus graph by semantic predicate and direction. Predicate IRIs are
 * preferred when a datapack supplies them; legacy label-only edges remain
 * compatible.
 */
export function groupGraphRelationships(
  edges: GroupableGraphEdge[],
  center: string
): GraphRelationshipGroup[] {
  const groups = new Map<string, GraphRelationshipGroup>();
  for (const edge of edges) {
    const key = graphRelationshipGroupKey(edge, center);
    const direction = relationshipDirection(edge, center);
    const predicate = edge.predicate?.trim() || edge.label.trim() || 'related';
    const group = groups.get(key) || {
      key,
      label: edge.label.trim() || predicate,
      predicate,
      direction,
      assertionStatuses: [],
      assertionScopes: [],
      authorityClasses: [],
      edgeIds: [],
      nodeIds: []
    };
    for (const [values, value] of [
      [group.assertionStatuses, edge.assertionStatus || 'unclassified'],
      [group.assertionScopes, edge.assertionScope || 'unclassified'],
      [group.authorityClasses, edge.authorityClass || 'unclassified']
    ] as Array<[string[], string]>) {
      if (!values.includes(value)) values.push(value);
    }
    group.edgeIds.push(edge.id);
    const relatedNodeIds = direction === 'outgoing'
      ? [edge.target]
      : direction === 'incoming'
        ? [edge.source]
        : [edge.source, edge.target].filter((id) => id !== center);
    for (const id of relatedNodeIds) {
      if (id && !group.nodeIds.includes(id)) group.nodeIds.push(id);
    }
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => (
    right.edgeIds.length - left.edgeIds.length
    || left.label.localeCompare(right.label)
    || left.direction.localeCompare(right.direction)
  ));
}

export function orderGraphRelationshipGroups(
  groups: GraphRelationshipGroup[],
  preferredOrder: string[]
): GraphRelationshipGroup[] {
  const byKey = new Map(groups.map((group) => [group.key, group]));
  return [
    ...preferredOrder.flatMap((key) => {
      const group = byKey.get(key);
      if (!group) return [];
      byKey.delete(key);
      return [group];
    }),
    ...groups.filter((group) => byKey.has(group.key))
  ];
}

const RELATIONSHIP_SIDE_SEQUENCE: GraphRelationshipSide[] = [
  'left',
  'top',
  'bottom',
  'right',
  'right',
  'bottom',
  'top',
  'left'
];

export function graphRelationshipGroupSlot(index: number): GraphRelationshipSlot {
  const safeIndex = Math.max(0, Math.floor(index));
  const side = RELATIONSHIP_SIDE_SEQUENCE[safeIndex % RELATIONSHIP_SIDE_SEQUENCE.length];
  const preceding = RELATIONSHIP_SIDE_SEQUENCE
    .slice(0, safeIndex % RELATIONSHIP_SIDE_SEQUENCE.length)
    .filter((candidate) => candidate === side).length;
  const fullCycles = Math.floor(safeIndex / RELATIONSHIP_SIDE_SEQUENCE.length) * 2;
  return { side, lane: fullCycles + preceding };
}

function spreadPosition(index: number, count: number, start: number, end: number): number {
  if (count <= 1) return (start + end) / 2;
  return start + ((end - start) * index) / (count - 1);
}

/**
 * Places predicate groups in ordered semantic regions around a focus node.
 * The first four regions are left list, top staircase, bottom staircase and
 * right list; additional groups occupy deterministic inner lanes.
 */
export function planRelationshipGroupPositions(
  center: string,
  groups: GraphRelationshipGroup[],
  width: number,
  height: number
): GraphRelationshipLayoutPlan {
  const positions = new Map<string, GraphPoint>();
  const slots = new Map<string, GraphRelationshipSlot>();
  const nodeSlots = new Map<string, GraphRelationshipSlot>();
  const claimedNodes = new Set<string>();
  const centerPoint = { x: width * 0.5, y: height * 0.53 };
  if (center) positions.set(center, centerPoint);

  const plannedGroups = groups.map((group, groupIndex) => {
    const slot = graphRelationshipGroupSlot(groupIndex);
    slots.set(group.key, slot);
    const members = group.nodeIds.filter((id) => id !== center && !claimedNodes.has(id));
    members.forEach((id) => {
      claimedNodes.add(id);
      nodeSlots.set(id, slot);
    });
    return { group, slot, members };
  });

  for (const side of ['left', 'right'] as const) {
    const sideGroups = plannedGroups.filter((item) => item.slot.side === side && item.members.length);
    if (!sideGroups.length) continue;
    const availableHeight = height * 0.68;
    const preferredRowGap = Math.min(46, height * 0.074);
    const preferredGroupGap = Math.min(112, height * 0.18);
    const naturalRows = sideGroups.reduce((sum, item) => sum + Math.max(0, item.members.length - 1), 0);
    const naturalGroupGaps = Math.max(0, sideGroups.length - 1);
    const naturalHeight = naturalRows * preferredRowGap + naturalGroupGaps * preferredGroupGap;
    const scale = naturalHeight > availableHeight ? availableHeight / naturalHeight : 1;
    const rowGap = Math.max(27, preferredRowGap * scale);
    const groupGap = Math.max(64, preferredGroupGap * scale);
    const contentHeight = naturalRows * rowGap + naturalGroupGaps * groupGap;
    const listCenterY = side === 'right'
      ? Math.max(centerPoint.y, height * 0.65)
      : centerPoint.y;
    let cursorY = listCenterY - contentHeight / 2;

    sideGroups.forEach(({ slot, members }) => {
      const lane = Math.min(slot.lane, 2);
      const x = side === 'left'
        ? width * (0.31 + lane * 0.055)
        : width * (0.84 - lane * 0.055);
      members.forEach((id, memberIndex) => {
        positions.set(id, { x, y: cursorY + memberIndex * rowGap });
      });
      cursorY += Math.max(0, members.length - 1) * rowGap + groupGap;
    });
  }

  for (const side of ['top', 'bottom'] as const) {
    const sideGroups = plannedGroups.filter((item) => item.slot.side === side && item.members.length);
    sideGroups.forEach(({ slot, members }, sideIndex) => {
      const lane = Math.min(slot.lane, 2);
      const groupOffset = (sideIndex - (sideGroups.length - 1) / 2) * width * 0.12;
      const startX = width * (0.38 + lane * 0.025) + groupOffset;
      const endX = width * (0.84 - lane * 0.035) + groupOffset;
      const stepRise = Math.min(36, height * 0.058);
      const baseY = side === 'top'
        ? height * (0.12 + lane * 0.16)
        : height * (0.84 - lane * 0.16);
      members.forEach((id, memberIndex) => {
        positions.set(id, {
          x: spreadPosition(memberIndex, members.length, startX, endX),
          y: baseY + (side === 'top' ? memberIndex : -memberIndex) * stepRise
        });
      });
    });
  }

  return { positions, slots, nodeSlots };
}

/**
 * Encodes a varying, explicitly supplied edge metric as line width. A single
 * value or a constant range deliberately produces no visual weight claim.
 */
export function planGraphEdgeWeights(
  edges: GraphEdgeWeightInput[],
  minWidth = 1.2,
  maxWidth = 5.4
): GraphEdgeWeightPlan {
  const widths = new Map(edges.map((edge) => [edge.id, minWidth]));
  const valuesByMetric = new Map<string, Array<{ id: string; value: number }>>();
  for (const edge of edges) {
    for (const [metric, value] of Object.entries(edge.metrics)) {
      if (!Number.isFinite(value) || Number(value) < 0) continue;
      const values = valuesByMetric.get(metric) || [];
      values.push({ id: edge.id, value: Number(value) });
      valuesByMetric.set(metric, values);
    }
  }
  const candidates = [...valuesByMetric.entries()]
    .map(([metric, values]) => ({
      metric,
      values,
      min: Math.min(...values.map((item) => item.value)),
      max: Math.max(...values.map((item) => item.value))
    }))
    .filter((candidate) => (
      candidate.values.length === edges.length
      && candidate.values.length >= 2
      && candidate.max > candidate.min
    ))
    .sort((left, right) => (
      right.values.length - left.values.length
      || Number(right.metric === 'relationship count') - Number(left.metric === 'relationship count')
      || left.metric.localeCompare(right.metric)
    ));
  const selected = candidates[0];
  if (!selected) return { active: false, metric: '', min: 0, max: 0, widths };

  const logarithmic = selected.min >= 0 && selected.max > Math.max(10, selected.min * 12);
  const transform = (value: number) => logarithmic ? Math.log1p(value) : value;
  const transformedMin = transform(selected.min);
  const transformedMax = transform(selected.max);
  const range = transformedMax - transformedMin || 1;
  for (const item of selected.values) {
    const ratio = (transform(item.value) - transformedMin) / range;
    widths.set(item.id, minWidth + Math.max(0, Math.min(1, ratio)) * (maxWidth - minWidth));
  }
  return {
    active: true,
    metric: selected.metric,
    min: selected.min,
    max: selected.max,
    widths
  };
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
