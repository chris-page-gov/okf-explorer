import { describe, expect, it } from 'vitest';
import {
  boxesOverlap,
  graphEdgeStateKey,
  graphRelationshipGroupKey,
  filterGraphRelationshipsBySemantics,
  graphRelationshipGroupSlot,
  groupGraphRelationships,
  orderGraphRelationshipGroups,
  planDirectedEdges,
  planGraphEdgeWeights,
  planGraphLabelLayers,
  planRelationshipGroupPositions,
  quadraticEdgeGeometry,
  shouldUseRelationshipLayout,
  type GraphBox,
  type GraphLabelItem
} from './graphPresentation';

function choice(x: number, y: number, text: string) {
  return {
    x,
    y,
    anchor: 'start' as const,
    text,
    box: { x, y: y - 14, w: 84, h: 18 }
  };
}

describe('graph presentation', () => {
  it('uses semantic regions for bounded focused graphs without forcing sparse graphs', () => {
    expect(shouldUseRelationshipLayout('', 3, 8)).toBe(false);
    expect(shouldUseRelationshipLayout('focus', 0, 8)).toBe(false);
    expect(shouldUseRelationshipLayout('focus', 3, 3)).toBe(false);
    expect(shouldUseRelationshipLayout('focus', 3, 4)).toBe(true);
    expect(shouldUseRelationshipLayout('focus', 1, 1, true)).toBe(true);
  });

  it('cycles every conflicting label without changing persistent labels', () => {
    const items: GraphLabelItem[] = [
      { id: 'selected', priority: 0, always: true, choices: [choice(10, 20, 'Selected')] },
      { id: 'free', priority: 1, choices: [choice(120, 20, 'Free')] },
      { id: 'alpha', priority: 2, choices: [choice(220, 20, 'Alpha')] },
      { id: 'beta', priority: 2, choices: [choice(240, 20, 'Beta')] },
      { id: 'gamma', priority: 2, choices: [choice(260, 20, 'Gamma')] }
    ];

    const phases = [0, 1, 2].map((phase) => planGraphLabelLayers(items, [], phase));
    const rotatingCoverage = new Set(phases.flatMap((plan) => [...plan.visible.keys()]));

    expect(phases[0].layerCount).toBeGreaterThan(1);
    expect(phases.every((plan) => plan.visible.has('selected'))).toBe(true);
    expect(phases.every((plan) => plan.visible.has('free'))).toBe(true);
    expect(rotatingCoverage).toEqual(new Set(items.map((item) => item.id)));

    for (const plan of phases) {
      const boxes = [...plan.visible.values()].map((label) => label.box);
      expect(boxes.some((box, index) => boxes.slice(index + 1).some((other) => boxesOverlap(box, other)))).toBe(false);
    }
  });

  it('does not discard labels when every preferred position intersects a node', () => {
    const obstacle: GraphBox = { x: 0, y: 0, w: 400, h: 200 };
    const items: GraphLabelItem[] = Array.from({ length: 24 }, (_, index) => ({
      id: `node-${index}`,
      priority: index,
      choices: [choice(12 + index * 4, 80, `Node ${index}`)]
    }));
    const plans = items.map((_item, phase) => planGraphLabelLayers(items, [{ id: 'blocker', box: obstacle }], phase));
    const coverage = new Set(plans.flatMap((plan) => [...plan.visible.keys()]));

    expect(coverage.size).toBe(items.length);
  });

  it('places a persistent label where it does not block every placement of a later label', () => {
    const items: GraphLabelItem[] = [
      {
        id: 'focus',
        priority: 0,
        always: true,
        choices: [choice(10, 20, 'Focus right'), choice(180, 20, 'Focus left')]
      },
      {
        id: 'edge-node',
        priority: 1,
        choices: [choice(35, 20, 'Only safe placement')]
      }
    ];

    const plan = planGraphLabelLayers(items, [], 0);
    expect(plan.visible.get('focus')?.x).toBe(180);
    expect(plan.visible.get('edge-node')?.x).toBe(35);
    expect(boxesOverlap(plan.visible.get('focus')!.box, plan.visible.get('edge-node')!.box)).toBe(false);
  });

  it('deduplicates equal reciprocal labels and offsets distinct ones towards their sources', () => {
    const same = planDirectedEdges([
      { id: 'a-b', source: 'a', target: 'b', label: 'related source' },
      { id: 'b-a', source: 'b', target: 'a', label: 'related source' }
    ]);
    expect([...same.values()].filter((edge) => edge.showLabel)).toHaveLength(1);
    expect(same.get('a-b')?.bend).toBe(24);
    expect(same.get('b-a')?.bend).toBe(24);

    const different = planDirectedEdges([
      { id: 'a-b', source: 'a', target: 'b', label: 'supports' },
      { id: 'b-a', source: 'b', target: 'a', label: 'derived from' }
    ]);
    expect([...different.values()].every((edge) => edge.showLabel && edge.labelT === 0.34)).toBe(true);
  });

  it('returns a trimmed quadratic path and source-weighted label point', () => {
    const geometry = quadraticEdgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, 10, 20, 20, 0.34);
    expect(geometry.d).toContain('M10 0 Q');
    expect(geometry.d).toContain('80 0');
    expect(geometry.labelX).toBeLessThan(50);
    expect(geometry.labelY).toBeGreaterThan(0);
  });

  it('groups focus edges by predicate and direction, then honours an explicit order', () => {
    const groups = groupGraphRelationships([
      { id: 'tag-a', source: 'focus', target: 'tag/a', label: 'tagged', predicate: 'dcat:keyword' },
      { id: 'tag-b', source: 'focus', target: 'tag/b', label: 'tagged', predicate: 'dcat:keyword' },
      { id: 'publisher', source: 'focus', target: 'publisher/ons', label: 'published by', predicate: 'dcterms:publisher' },
      { id: 'incoming', source: 'catalogue/ons', target: 'focus', label: 'catalogues', predicate: 'dcat:record' }
    ], 'focus');

    expect(groups.map((group) => [group.key, group.edgeIds.length])).toEqual([
      ['outgoing:dcat:keyword', 2],
      ['incoming:dcat:record', 1],
      ['outgoing:dcterms:publisher', 1]
    ]);
    expect(groups[0].nodeIds).toEqual(['tag/a', 'tag/b']);
    expect(orderGraphRelationshipGroups(groups, ['outgoing:dcterms:publisher'])[0].label).toBe('published by');
  });

  it('round-trips long authored edge and predicate identities through bounded graph state keys', () => {
    const longTail = 'semantic-segment/'.repeat(48);
    const edge = {
      id: 'long-edge',
      source: `work/${longTail}source`,
      target: `concept/${longTail}target`,
      label: `relates through ${longTail}`
    };
    const edgeKey = graphEdgeStateKey(edge);
    const changedEdgeKey = graphEdgeStateKey({ ...edge, target: `${edge.target}-changed` });
    expect(edgeKey).toMatch(/^okf-long-v1:\d+:[0-9a-f]{16}:[0-9a-f]{16}$/);
    expect(edgeKey.length).toBeLessThanOrEqual(512);
    expect(graphEdgeStateKey(edge)).toBe(edgeKey);
    expect(changedEdgeKey).not.toBe(edgeKey);

    const predicate = `https://example.gov.uk/ontology/${longTail}relationship`;
    const groupKey = graphRelationshipGroupKey(
      { ...edge, predicate },
      edge.source
    );
    expect(groupKey).toMatch(/^okf-long-v1:\d+:[0-9a-f]{16}:[0-9a-f]{16}$/);
    expect(groupKey.length).toBeLessThanOrEqual(512);
    expect(graphRelationshipGroupKey({ ...edge, predicate }, edge.source)).toBe(groupKey);
    expect(
      graphRelationshipGroupKey({ ...edge, predicate: `${predicate}-changed` }, edge.source)
    ).not.toBe(groupKey);
  });

  it('filters semantic relationships without conflating status, scope and authority', () => {
    const edges = [
      {
        id: 'official', source: 'focus', target: 'a', label: 'has designation',
        predicate: 'heritage:hasDesignation', assertionStatus: 'official',
        assertionScope: 'real-world', authorityClass: 'official'
      },
      {
        id: 'inferred', source: 'focus', target: 'b', label: 'located in',
        predicate: 'geo:sfWithin', assertionStatus: 'inferred',
        assertionScope: 'real-world', authorityClass: 'derived'
      },
      {
        id: 'fixture', source: 'focus', target: 'c', label: 'located in',
        predicate: 'geo:sfWithin', assertionStatus: 'normalized',
        assertionScope: 'synthetic-fixture', authorityClass: 'synthetic'
      }
    ];

    expect(filterGraphRelationshipsBySemantics(edges, {
      assertionScopes: ['real-world'],
      authorityClasses: ['derived']
    }).map(({ id }) => id)).toEqual(['inferred']);

    const groups = groupGraphRelationships(edges, 'focus');
    const spatial = groups.find(({ predicate }) => predicate === 'geo:sfWithin');
    expect(spatial?.assertionStatuses).toEqual(['inferred', 'normalized']);
    expect(spatial?.assertionScopes).toEqual(['real-world', 'synthetic-fixture']);
    expect(spatial?.authorityClasses).toEqual(['derived', 'synthetic']);
  });

  it('assigns ordered relationship groups to lists and staircases around the focus', () => {
    const groups = groupGraphRelationships([
      { id: 'a', source: 'focus', target: 'a', label: 'alpha' },
      { id: 'b', source: 'focus', target: 'b', label: 'beta' },
      { id: 'c', source: 'focus', target: 'c', label: 'gamma' },
      { id: 'd', source: 'focus', target: 'd', label: 'delta' },
      { id: 'e', source: 'focus', target: 'e', label: 'epsilon' }
    ], 'focus');
    const ordered = orderGraphRelationshipGroups(groups, [
      'outgoing:alpha',
      'outgoing:beta',
      'outgoing:gamma',
      'outgoing:delta',
      'outgoing:epsilon'
    ]);
    const plan = planRelationshipGroupPositions('focus', ordered, 900, 620);

    expect(graphRelationshipGroupSlot(0)).toEqual({ side: 'left', lane: 0 });
    expect(graphRelationshipGroupSlot(1)).toEqual({ side: 'top', lane: 0 });
    expect(graphRelationshipGroupSlot(2)).toEqual({ side: 'bottom', lane: 0 });
    expect(graphRelationshipGroupSlot(3)).toEqual({ side: 'right', lane: 0 });
    expect(graphRelationshipGroupSlot(4)).toEqual({ side: 'right', lane: 1 });
    expect(plan.positions.get('focus')).toEqual({ x: 450, y: 328.6 });
    expect(plan.nodeSlots.get('a')).toEqual({ side: 'left', lane: 0 });
    expect(plan.nodeSlots.get('b')).toEqual({ side: 'top', lane: 0 });
    expect(plan.positions.get('a')!.x).toBeCloseTo(279);
    expect(plan.positions.get('b')!.y).toBeLessThan(100);
    expect(plan.positions.get('c')!.y).toBeGreaterThan(500);
    expect(plan.positions.get('d')!.x).toBeGreaterThan(700);
    expect(plan.positions.get('e')!.x).toBeGreaterThan(680);
    expect(Math.abs(plan.positions.get('d')!.y - plan.positions.get('e')!.y)).toBeGreaterThan(100);
  });

  it('splits one dense relationship group into paired outside-labelled columns', () => {
    const groups = groupGraphRelationships(
      Array.from({ length: 14 }, (_unused, index) => ({
        id: `edge-${index}`,
        source: `record-${index}`,
        target: 'focus',
        label: 'matches life-course domain'
      })),
      'focus'
    );
    const plan = planRelationshipGroupPositions('focus', groups, 900, 620);
    const left = Array.from({ length: 7 }, (_unused, index) => plan.positions.get(`record-${index * 2}`)!);
    const right = Array.from({ length: 7 }, (_unused, index) => plan.positions.get(`record-${index * 2 + 1}`)!);

    expect(groups).toHaveLength(1);
    expect(left.every((point) => point.x < 450)).toBe(true);
    expect(right.every((point) => point.x > 450)).toBe(true);
    expect(left.map((point) => point.y)).toEqual(right.map((point) => point.y));
    expect(plan.nodeSlots.get('record-0')).toEqual({ side: 'left', lane: 0 });
    expect(plan.nodeSlots.get('record-1')).toEqual({ side: 'right', lane: 0 });
  });

  it('uses edge width only for a meaningful varying metric', () => {
    const inactive = planGraphEdgeWeights([
      { id: 'a', metrics: { confidence: 0.8 } },
      { id: 'b', metrics: { confidence: 0.8 } }
    ]);
    expect(inactive.active).toBe(false);
    expect([...inactive.widths.values()]).toEqual([1.2, 1.2]);

    const incomplete = planGraphEdgeWeights([
      { id: 'a', metrics: { strength: 0.25 } },
      { id: 'b', metrics: {} },
      { id: 'c', metrics: { strength: 0.9 } }
    ]);
    expect(incomplete.active).toBe(false);

    const active = planGraphEdgeWeights([
      { id: 'a', metrics: { 'relationship count': 1 } },
      { id: 'b', metrics: { 'relationship count': 10 } },
      { id: 'c', metrics: { 'relationship count': 100 } }
    ]);
    expect(active).toMatchObject({
      active: true,
      metric: 'relationship count',
      min: 1,
      max: 100
    });
    expect(active.widths.get('a')).toBe(1.2);
    expect(active.widths.get('b')!).toBeGreaterThan(active.widths.get('a')!);
    expect(active.widths.get('c')).toBe(5.4);
  });
});
