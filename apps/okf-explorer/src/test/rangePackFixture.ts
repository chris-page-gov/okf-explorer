import type {
  LargeReleaseDataPlaneEntry,
  LargeReleaseDataPlaneIndex,
  LargeReleasePack
} from '$lib/types';
import {
  RELEASE_DATA_PLANE_ALGORITHM,
  RELEASE_DATA_PLANE_SCHEMA,
  sha256Hex
} from '$lib/sources/releaseDataPlane';

type FixtureResource = {
  path: string;
  value: unknown;
  compression?: 'identity' | 'gzip';
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const body = new Response(buffer).body;
  if (!body) throw new Error('Fixture stream unavailable');
  return new Uint8Array(
    await new Response(body.pipeThrough(new CompressionStream('gzip'))).arrayBuffer()
  );
}

function concatenate(chunks: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function makeRangePackFixture(resources: FixtureResource[]) {
  const packId = 'pack-00000';
  const assetName = 'fixture.pack.gz';
  const entries: LargeReleaseDataPlaneEntry[] = [];
  const members: Uint8Array[] = [];
  let offset = 0;
  for (const resource of resources) {
    const jsonBytes = new TextEncoder().encode(`${JSON.stringify(resource.value)}\n`);
    const compression = resource.compression || 'identity';
    const logicalBytes = compression === 'gzip' ? await gzip(jsonBytes) : jsonBytes;
    const transportCompression = compression === 'identity' ? 'gzip' : 'identity';
    const packedBytes = transportCompression === 'gzip' ? await gzip(logicalBytes) : logicalBytes;
    entries.push({
      path: resource.path,
      bytes: logicalBytes.byteLength,
      sha256: await sha256Hex(logicalBytes),
      compression,
      pack: packId,
      offset,
      packed_bytes: packedBytes.byteLength,
      packed_sha256: await sha256Hex(packedBytes),
      transport_compression: transportCompression
    });
    members.push(packedBytes);
    offset += packedBytes.byteLength;
  }
  const packBytes = concatenate(members);
  const packs: LargeReleasePack[] = [
    {
      id: packId,
      asset_name: assetName,
      bytes: packBytes.byteLength,
      sha256: await sha256Hex(packBytes),
      path: `data-packs/${assetName}`,
      release_url: `https://github.com/example/repo/releases/download/v1.0.0/${assetName}`
    }
  ];
  const document: LargeReleaseDataPlaneIndex = {
    schema: RELEASE_DATA_PLANE_SCHEMA,
    schema_version: '1.0',
    algorithm: RELEASE_DATA_PLANE_ALGORITHM,
    repository: 'example/repo',
    tag: 'v1.0.0',
    snapshot: 'snapshot-1',
    max_pack_bytes: 64 * 1024 * 1024,
    packs,
    entries,
    counts: {
      packs: packs.length,
      virtual_shards: entries.length,
      packed_bytes: packBytes.byteLength,
      source_bytes: entries.reduce((total, entry) => total + entry.bytes, 0)
    },
    index_root_sha256: ''
  };
  document.index_root_sha256 = await sha256Hex(
    `${canonicalJson({ algorithm: RELEASE_DATA_PLANE_ALGORITHM, packs, entries })}\n`
  );
  const indexText = `${JSON.stringify(document)}\n`;
  return {
    document,
    indexText,
    indexHash: await sha256Hex(indexText),
    packBytes,
    packUrl: `https://example.test/bundle/data-packs/${assetName}`
  };
}

export function rangeResponse(
  fixture: Awaited<ReturnType<typeof makeRangePackFixture>>,
  range: string,
  overrides: { contentRange?: string; bytes?: Uint8Array; status?: number } = {}
): Response {
  const match = /^bytes=(\d+)-(\d+)$/.exec(range);
  if (!match) return new Response('', { status: 416 });
  const start = Number(match[1]);
  const end = Number(match[2]);
  const bytes = overrides.bytes || fixture.packBytes.slice(start, end + 1);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Response(buffer, {
    status: overrides.status ?? 206,
    headers: {
      'content-length': String(bytes.byteLength),
      'content-range': overrides.contentRange || `bytes ${start}-${end}/${fixture.packBytes.byteLength}`
    }
  });
}
