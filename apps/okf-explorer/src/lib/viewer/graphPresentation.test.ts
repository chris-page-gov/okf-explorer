import { describe, expect, it } from 'vitest';
import {
  boxesOverlap,
  planDirectedEdges,
  planGraphLabelLayers,
  quadraticEdgeGeometry,
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

  it('deduplicates equal reciprocal labels and offsets distinct ones toward their sources', () => {
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
});
