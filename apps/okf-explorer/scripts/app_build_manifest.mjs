import { createHash } from 'node:crypto';
import { constants as fileConstants } from 'node:fs';
import {
  lstat,
  open,
  opendir,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';

export const BUILD_MANIFEST_FILENAME =
  'okf-explorer-build-manifest.json';
export const BUILD_MANIFEST_SCHEMA =
  'okf-explorer-app-build-manifest.v1';
export const BUILD_TREE_ALGORITHM =
  'sha256-canonical-json-materials-v1';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MATERIAL_KEYS = ['path', 'bytes', 'sha256'];
const MANIFEST_KEYS = [
  'schema',
  'algorithm',
  'file_count',
  'tree_sha256',
  'materials'
];

export const BUILD_INSPECTION_LIMITS = Object.freeze({
  max_duration_ms: 5 * 60 * 1000,
  max_entries: 2_000,
  max_files: 1_000,
  max_bytes: 128 * 1024 * 1024,
  max_file_bytes: 128 * 1024 * 1024,
  max_manifest_bytes: 16 * 1024 * 1024,
  max_depth: 32
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function compareBuildPath(left, right) {
  const leftCodePoints = [...left];
  const rightCodePoints = [...right];
  const length = Math.min(
    leftCodePoints.length,
    rightCodePoints.length
  );
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftCodePoints[index].codePointAt(0);
    const rightValue = rightCodePoints[index].codePointAt(0);
    if (leftValue !== rightValue) {
      return leftValue < rightValue ? -1 : 1;
    }
  }
  return leftCodePoints.length < rightCodePoints.length
    ? -1
    : leftCodePoints.length > rightCodePoints.length
      ? 1
      : 0;
}

export function safeBuildPath(relative) {
  invariant(
    typeof relative === 'string' &&
      relative.length > 0 &&
      relative.length <= 4096,
    'Build material path must be a bounded non-empty string'
  );
  invariant(
    !relative.includes('\\') &&
      !path.posix.isAbsolute(relative) &&
      !/[\u0000-\u001f\u007f]/.test(relative),
    `Unsafe build material path: ${relative}`
  );
  const normalized = path.posix.normalize(relative);
  invariant(
    normalized === relative &&
      normalized.split('/').every(
        (part) => part && part !== '.' && part !== '..'
      ),
    `Non-canonical build material path: ${relative}`
  );
  invariant(
    normalized !== BUILD_MANIFEST_FILENAME,
    'The canonical build manifest must exclude itself from materials'
  );
  return normalized;
}

function exactKeys(value, expected, label) {
  invariant(
    value && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object`
  );
  invariant(
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...expected].sort()),
    `${label} has an unexpected key set`
  );
}

export function validateBuildMaterial(value, label = 'build material') {
  exactKeys(value, MATERIAL_KEYS, label);
  const relative = safeBuildPath(value.path);
  invariant(
    Number.isSafeInteger(value.bytes) && value.bytes > 0,
    `${label} bytes must be a positive safe integer`
  );
  invariant(
    typeof value.sha256 === 'string' &&
      SHA256_PATTERN.test(value.sha256),
    `${label} SHA-256 is invalid`
  );
  return {
    path: relative,
    bytes: value.bytes,
    sha256: value.sha256
  };
}

export function validateCanonicalMaterials(materials) {
  invariant(
    Array.isArray(materials) && materials.length > 0,
    'Build materials must be a non-empty array'
  );
  const canonical = materials.map((value, index) =>
    validateBuildMaterial(value, `build material ${index}`)
  );
  const paths = canonical.map((value) => value.path);
  invariant(
    new Set(paths).size === paths.length,
    'Build material paths must be unique'
  );
  invariant(
    paths.every(
      (value, index) =>
        index === 0 ||
        compareBuildPath(paths[index - 1], value) < 0
    ),
    'Build materials must be strictly sorted by path'
  );
  invariant(
    paths.filter((value) => value === 'index.html').length === 1,
    'Build materials must contain exactly one index.html'
  );
  return canonical;
}

export function canonicalBuildTreeBytes(materials) {
  const canonical = validateCanonicalMaterials(materials);
  return Buffer.from(`${JSON.stringify(canonical)}\n`, 'utf8');
}

export function canonicalBuildManifest(value) {
  exactKeys(value, MANIFEST_KEYS, 'build manifest');
  invariant(
    value.schema === BUILD_MANIFEST_SCHEMA,
    `Build manifest schema must be ${BUILD_MANIFEST_SCHEMA}`
  );
  invariant(
    value.algorithm === BUILD_TREE_ALGORITHM,
    `Build manifest algorithm must be ${BUILD_TREE_ALGORITHM}`
  );
  const materials = validateCanonicalMaterials(value.materials);
  invariant(
    Number.isSafeInteger(value.file_count) &&
      value.file_count > 0 &&
      value.file_count === materials.length,
    'Build manifest file_count differs from materials'
  );
  const expectedTree = sha256(canonicalBuildTreeBytes(materials));
  invariant(
    value.tree_sha256 === expectedTree,
    'Build manifest tree SHA-256 differs from canonical materials'
  );
  return {
    schema: BUILD_MANIFEST_SCHEMA,
    algorithm: BUILD_TREE_ALGORITHM,
    file_count: materials.length,
    tree_sha256: expectedTree,
    materials
  };
}

export function renderBuildManifest(value) {
  return Buffer.from(
    `${JSON.stringify(canonicalBuildManifest(value), null, 2)}\n`,
    'utf8'
  );
}

export function parseCanonicalBuildManifest(bytes) {
  invariant(
    Buffer.isBuffer(bytes) && bytes.length > 0,
    'Build manifest bytes must be a non-empty Buffer'
  );
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(
      `Build manifest is not valid UTF-8 JSON: ${error.message}`
    );
  }
  const manifest = canonicalBuildManifest(parsed);
  invariant(
    bytes.equals(renderBuildManifest(manifest)),
    'Build manifest bytes are not in canonical form'
  );
  return manifest;
}

function stableFileIdentity(value) {
  return [
    value.dev,
    value.ino,
    value.mode,
    value.size,
    value.mtimeMs,
    value.ctimeMs,
    value.nlink
  ];
}

function inspectionContext(options = {}) {
  const supplied = options.limits || {};
  const limits = {};
  for (const [name, maximum] of Object.entries(BUILD_INSPECTION_LIMITS)) {
    const value = supplied[name] ?? maximum;
    invariant(
      Number.isSafeInteger(value) && value > 0 && value <= maximum,
      `Build inspection limit ${name} must be a positive integer no greater than ${maximum}`
    );
    limits[name] = value;
  }
  const requestedDeadline = options.deadline ??
    Date.now() + limits.max_duration_ms;
  invariant(
    Number.isFinite(requestedDeadline),
    'Build inspection deadline must be finite'
  );
  return {
    limits,
    deadline: Math.min(
      requestedDeadline,
      Date.now() + limits.max_duration_ms
    ),
    entries: 0,
    files: 0,
    bytes: 0
  };
}

function inspectBeforeWork(context, label) {
  invariant(
    Date.now() < context.deadline,
    `${label} exceeded the build inspection deadline`
  );
}

async function readExactBoundedHandle(
  handle,
  size,
  label,
  context = null
) {
  invariant(
    Number.isSafeInteger(size) && size > 0,
    `${label} has an invalid bounded byte count`
  );
  if (context) inspectBeforeWork(context, label);
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    if (context) inspectBeforeWork(context, label);
    const { bytesRead } = await handle.read(
      bytes,
      offset,
      Math.min(1024 * 1024, size - offset),
      offset
    );
    if (context) inspectBeforeWork(context, label);
    invariant(bytesRead > 0, `${label} was truncated while it was read`);
    offset += bytesRead;
  }
  if (context) inspectBeforeWork(context, label);
  const probe = Buffer.allocUnsafe(1);
  const { bytesRead: extraBytes } = await handle.read(probe, 0, 1, size);
  if (context) inspectBeforeWork(context, label);
  invariant(extraBytes === 0, `${label} grew while it was read`);
  return bytes;
}

async function readStableRegularFile(
  absolute,
  relative,
  { context = null, maxBytes = null, countMaterial = false } = {}
) {
  if (context) inspectBeforeWork(context, `Build material ${relative}`);
  const before = await lstat(absolute);
  if (context) inspectBeforeWork(context, `Build material ${relative}`);
  invariant(
    before.isFile() &&
      !before.isSymbolicLink() &&
      before.nlink === 1,
    `Build material is not an independent regular file: ${relative}`
  );
  const byteLimit = maxBytes ?? context?.limits.max_file_bytes ??
    BUILD_INSPECTION_LIMITS.max_file_bytes;
  invariant(
    before.size > 0 && before.size <= byteLimit,
    `Build material exceeds its byte bound: ${relative}`
  );
  if (context && countMaterial) {
    invariant(
      context.files < context.limits.max_files,
      'Build tree exceeds its file-count bound'
    );
    invariant(
      context.bytes + before.size <= context.limits.max_bytes,
      'Build tree exceeds its aggregate byte bound'
    );
    context.files += 1;
    context.bytes += before.size;
  }
  if (context) inspectBeforeWork(context, `Build material ${relative}`);
  const handle = await open(
    absolute,
    fileConstants.O_RDONLY | (fileConstants.O_NOFOLLOW || 0)
  );
  try {
    if (context) inspectBeforeWork(context, `Build material ${relative}`);
    const opened = await handle.stat();
    if (context) inspectBeforeWork(context, `Build material ${relative}`);
    invariant(
      opened.isFile() && opened.nlink === 1 &&
        opened.dev === before.dev && opened.ino === before.ino &&
        opened.size === before.size && opened.size <= byteLimit,
      `Build material changed before it was opened: ${relative}`
    );
    const bytes = await readExactBoundedHandle(
      handle,
      opened.size,
      `Build material ${relative}`,
      context
    );
    if (context) inspectBeforeWork(context, `Build material ${relative}`);
    const after = await handle.stat();
    if (context) inspectBeforeWork(context, `Build material ${relative}`);
    const pathAfter = await lstat(absolute);
    if (context) inspectBeforeWork(context, `Build material ${relative}`);
    invariant(
      bytes.length === opened.size &&
        JSON.stringify(stableFileIdentity(opened)) ===
          JSON.stringify(stableFileIdentity(after)) &&
        JSON.stringify(stableFileIdentity(before)) ===
          JSON.stringify(stableFileIdentity(pathAfter)),
      `Build material changed while it was read: ${relative}`
    );
    if (context) inspectBeforeWork(context, `Build material ${relative}`);
    return bytes;
  } finally {
    await handle.close();
  }
}

async function boundedChildren(
  absoluteDirectory,
  directory,
  context,
  label
) {
  inspectBeforeWork(context, label);
  const before = await lstat(absoluteDirectory);
  inspectBeforeWork(context, label);
  invariant(
    before.isDirectory() && !before.isSymbolicLink(),
    `${label} is not a real directory: ${directory || '.'}`
  );
  inspectBeforeWork(context, label);
  const handle = await opendir(absoluteDirectory);
  const children = [];
  try {
    while (true) {
      inspectBeforeWork(context, label);
      const child = await handle.read();
      if (child === null) break;
      invariant(
        context.entries < context.limits.max_entries,
        `${label} exceeds its entry-count bound`
      );
      context.entries += 1;
      children.push(child);
    }
  } finally {
    await handle.close();
  }
  inspectBeforeWork(context, label);
  const after = await lstat(absoluteDirectory);
  inspectBeforeWork(context, label);
  invariant(
    JSON.stringify(stableFileIdentity(before)) ===
      JSON.stringify(stableFileIdentity(after)),
    `${label} directory changed while it was enumerated: ${directory || '.'}`
  );
  children.sort((left, right) =>
    compareBuildPath(left.name, right.name)
  );
  return children;
}

async function collectSourceFiles(root, context, directory = '') {
  inspectBeforeWork(context, 'Build tree traversal');
  const absoluteDirectory = directory
    ? path.join(root, ...directory.split('/'))
    : root;
  const children = await boundedChildren(
    absoluteDirectory,
    directory,
    context,
    'Build path'
  );
  const files = [];
  for (const child of children) {
    const relative = directory
      ? path.posix.join(directory, child.name)
      : child.name;
    if (!directory && relative === BUILD_MANIFEST_FILENAME) continue;
    const safe = safeBuildPath(relative);
    invariant(
      safe.split('/').length <= context.limits.max_depth,
      'Build tree exceeds its depth bound'
    );
    const absolute = path.join(root, ...safe.split('/'));
    inspectBeforeWork(context, `Build path ${safe}`);
    const metadata = await lstat(absolute);
    inspectBeforeWork(context, `Build path ${safe}`);
    invariant(
      !metadata.isSymbolicLink(),
      `Build tree contains a symbolic link: ${safe}`
    );
    if (metadata.isDirectory()) {
      for (const nested of await collectSourceFiles(root, context, safe)) {
        files.push(nested);
      }
      continue;
    }
    invariant(
      metadata.isFile(),
      `Build tree contains a non-regular entry: ${safe}`
    );
    const bytes = await readStableRegularFile(absolute, safe, {
      context,
      countMaterial: true
    });
    files.push({
      material: {
        path: safe,
        bytes: bytes.length,
        sha256: sha256(bytes)
      },
      bytes
    });
  }
  return files;
}

async function collectAppNamespaceFiles(
  root,
  context,
  directory = '_app'
) {
  inspectBeforeWork(context, 'Assembled app namespace traversal');
  const absoluteDirectory = path.join(
    root,
    ...directory.split('/')
  );
  const children = await boundedChildren(
    absoluteDirectory,
    directory,
    context,
    'Assembled app namespace'
  );
  const materials = [];
  for (const child of children) {
    const relative = safeBuildPath(
      path.posix.join(directory, child.name)
    );
    invariant(
      relative.split('/').length <= context.limits.max_depth,
      'Assembled app namespace exceeds its depth bound'
    );
    const absolute = path.join(root, ...relative.split('/'));
    inspectBeforeWork(context, `Assembled app namespace ${relative}`);
    const metadata = await lstat(absolute);
    inspectBeforeWork(context, `Assembled app namespace ${relative}`);
    invariant(
      !metadata.isSymbolicLink(),
      `Assembled app namespace contains a symbolic link: ${relative}`
    );
    if (metadata.isDirectory()) {
      for (const nested of await collectAppNamespaceFiles(
        root,
        context,
        relative
      )) {
        materials.push(nested);
      }
      continue;
    }
    invariant(
      metadata.isFile(),
      `Assembled app namespace contains a non-regular entry: ${relative}`
    );
    const bytes = await readStableRegularFile(absolute, relative, {
      context,
      countMaterial: true
    });
    materials.push({
      path: relative,
      bytes: bytes.length,
      sha256: sha256(bytes)
    });
  }
  return materials;
}

export async function inspectBuildSourceTree(root, options = {}) {
  const absoluteRoot = path.resolve(root);
  const context = inspectionContext(options);
  const files = await collectSourceFiles(absoluteRoot, context);
  inspectBeforeWork(context, 'Build manifest material ordering');
  files.sort((left, right) =>
    compareBuildPath(left.material.path, right.material.path)
  );
  inspectBeforeWork(context, 'Build manifest material validation');
  const materials = validateCanonicalMaterials(
    files.map((value) => value.material)
  );
  inspectBeforeWork(context, 'Build manifest serialisation');
  const manifest = canonicalBuildManifest({
    schema: BUILD_MANIFEST_SCHEMA,
    algorithm: BUILD_TREE_ALGORITHM,
    file_count: materials.length,
    tree_sha256: sha256(canonicalBuildTreeBytes(materials)),
    materials
  });
  inspectBeforeWork(context, 'Build manifest serialisation');
  const manifestBytes = renderBuildManifest(manifest);
  inspectBeforeWork(context, 'Build manifest serialisation');
  return {
    files,
    manifest,
    manifestBytes
  };
}

export async function inspectCanonicalBuildRoot(root, options = {}) {
  const absoluteRoot = path.resolve(root);
  const context = inspectionContext(options);
  const manifestPath = path.join(
    absoluteRoot,
    BUILD_MANIFEST_FILENAME
  );
  const manifestBytes = await readStableRegularFile(
    manifestPath,
    BUILD_MANIFEST_FILENAME,
    {
      context,
      maxBytes: context.limits.max_manifest_bytes
    }
  );
  inspectBeforeWork(context, 'Canonical build manifest parsing');
  const manifest = parseCanonicalBuildManifest(manifestBytes);
  inspectBeforeWork(context, 'Canonical build manifest parsing');
  invariant(
    manifest.file_count <= context.limits.max_files,
    'Build manifest exceeds its file-count bound'
  );
  const source = await inspectBuildSourceTree(absoluteRoot, {
    limits: context.limits,
    deadline: context.deadline
  });
  invariant(
    manifestBytes.equals(source.manifestBytes),
    'Build manifest does not describe the exact app-build source tree'
  );
  return {
    ...source,
    manifest,
    manifestBytes,
    manifestMaterial: {
      path: BUILD_MANIFEST_FILENAME,
      bytes: manifestBytes.length,
      sha256: sha256(manifestBytes)
    }
  };
}

export async function verifyAssembledAppBuild(
  siteRoot,
  appBuildRoot,
  options = {}
) {
  const absoluteSiteRoot = path.resolve(siteRoot);
  const source = await inspectCanonicalBuildRoot(appBuildRoot, options);
  const assembledContext = inspectionContext(options);
  const assembledManifestPath = path.join(
    absoluteSiteRoot,
    BUILD_MANIFEST_FILENAME
  );
  const assembledManifestBytes = await readStableRegularFile(
    assembledManifestPath,
    BUILD_MANIFEST_FILENAME,
    {
      context: assembledContext,
      maxBytes: assembledContext.limits.max_manifest_bytes
    }
  );
  const assembledManifest = parseCanonicalBuildManifest(
    assembledManifestBytes
  );
  invariant(
    assembledManifestBytes.equals(source.manifestBytes),
    'Assembled site build manifest differs from the canonical app build'
  );

  for (const material of assembledManifest.materials) {
    const absolute = path.join(
      absoluteSiteRoot,
      ...material.path.split('/')
    );
    const bytes = await readStableRegularFile(
      absolute,
      material.path,
      {
        context: assembledContext,
        countMaterial: true
      }
    );
    invariant(
      bytes.length === material.bytes &&
        sha256(bytes) === material.sha256,
      `Assembled app material differs: ${material.path}`
    );
  }

  const declaredAppNamespace = assembledManifest.materials
    .filter((material) => material.path.startsWith('_app/'));
  invariant(
    declaredAppNamespace.length > 0,
    'Canonical app build declares no _app namespace materials'
  );
  const assembledAppNamespace = await collectAppNamespaceFiles(
    absoluteSiteRoot,
    inspectionContext({
      limits: assembledContext.limits,
      deadline: assembledContext.deadline
    })
  );
  assembledAppNamespace.sort((left, right) =>
    compareBuildPath(left.path, right.path)
  );
  invariant(
    JSON.stringify(assembledAppNamespace) ===
      JSON.stringify(declaredAppNamespace),
    'Assembled _app namespace differs from the canonical app build'
  );

  return {
    schema: BUILD_MANIFEST_SCHEMA,
    algorithm: assembledManifest.algorithm,
    files: assembledManifest.file_count,
    tree_sha256: assembledManifest.tree_sha256,
    manifest: {
      path: BUILD_MANIFEST_FILENAME,
      bytes: assembledManifestBytes.length,
      sha256: sha256(assembledManifestBytes)
    }
  };
}

export async function writeCanonicalBuildManifest(root, options = {}) {
  const absoluteRoot = path.resolve(root);
  const source = await inspectBuildSourceTree(absoluteRoot, options);
  const manifestPath = path.join(
    absoluteRoot,
    BUILD_MANIFEST_FILENAME
  );
  await writeFile(manifestPath, source.manifestBytes, {
    flag: 'wx',
    mode: 0o644
  });
  return inspectCanonicalBuildRoot(absoluteRoot, options);
}

function exactCapturedMaterial(value, expected) {
  exactKeys(value, MATERIAL_KEYS, 'captured build material');
  invariant(
    value.path === expected.path &&
      value.bytes === expected.bytes &&
      value.sha256 === expected.sha256,
    `Captured build material differs: ${expected.path}`
  );
  return {
    path: value.path,
    bytes: value.bytes,
    sha256: value.sha256
  };
}

export async function captureAppBuildEvidence(
  inspection,
  captureMaterial,
  evidenceRoot = 'explorer-build'
) {
  invariant(
    typeof captureMaterial === 'function',
    'captureMaterial must be a function'
  );
  invariant(
    evidenceRoot === 'explorer-build',
    'App-build evidence root must be explorer-build'
  );
  const manifest = parseCanonicalBuildManifest(
    inspection?.manifestBytes
  );
  invariant(
    Array.isArray(inspection?.files) &&
      inspection.files.length === manifest.file_count,
    'Inspected build files differ from canonical manifest count'
  );
  const sourceFiles = inspection.files.map((sourceFile, index) => {
    const expected = manifest.materials[index];
    invariant(
      sourceFile &&
        Buffer.isBuffer(sourceFile.bytes) &&
        sourceFile.bytes.length === expected.bytes &&
        sha256(sourceFile.bytes) === expected.sha256 &&
        JSON.stringify(sourceFile.material) ===
          JSON.stringify(expected),
      `Inspected build file differs from manifest: ${expected.path}`
    );
    return sourceFile;
  });

  const expectedManifest = {
    path: `${evidenceRoot}/${BUILD_MANIFEST_FILENAME}`,
    bytes: inspection.manifestBytes.length,
    sha256: sha256(inspection.manifestBytes)
  };
  const capturedManifest = exactCapturedMaterial(
    await captureMaterial(
      expectedManifest.path,
      inspection.manifestBytes
    ),
    expectedManifest
  );
  const capturedMaterials = [];
  for (const sourceFile of sourceFiles) {
    const expected = {
      ...sourceFile.material,
      path: `${evidenceRoot}/${sourceFile.material.path}`
    };
    capturedMaterials.push(
      exactCapturedMaterial(
        await captureMaterial(expected.path, sourceFile.bytes),
        expected
      )
    );
  }
  const indexes = capturedMaterials.filter(
    (material) => material.path === `${evidenceRoot}/index.html`
  );
  invariant(
    indexes.length === 1,
    'Captured app-build evidence must contain exactly one index.html'
  );
  return {
    root: evidenceRoot,
    manifest: capturedManifest,
    index: indexes[0],
    files: manifest.file_count,
    sha256: manifest.tree_sha256,
    algorithm: manifest.algorithm,
    materials: capturedMaterials
  };
}
