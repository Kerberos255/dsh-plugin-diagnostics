import fs from 'node:fs';
import path from 'node:path';

export const COMPATIBILITY_PLUGIN_NAMES = Object.freeze([
  'dsh-browser-tools',
  'dsh-channel-core',
  'dsh-desktop-tools',
  'dsh-instruction-files',
  'dsh-lossless-context',
  'dsh-mcp',
  'dsh-memory-dreaming',
  'dsh-plugin-diagnostics',
  'dsh-skill-workshop',
  'dsh-status-cards',
  'dsh-tavern',
  'dsh-web-search-router',
]);

const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function findUntestedPlugins(manifests, runtimeVersion) {
  if (typeof runtimeVersion !== 'string' || !VERSION.test(runtimeVersion)) return [];
  const issues = [];
  for (const manifest of manifests) {
    if (!manifest || typeof manifest.name !== 'string' || !/^dsh-[a-z0-9-]{2,60}$/.test(manifest.name)) continue;
    const compatibility = manifest.dshCompatibility;
    const testedRuntime = compatibility?.testedRuntime;
    if (compatibility?.policy !== 'warn' || typeof testedRuntime !== 'string' || !VERSION.test(testedRuntime)) continue;
    if (testedRuntime === runtimeVersion) continue;
    issues.push({ name: manifest.name, testedRuntime, runtimeVersion });
  }
  return issues;
}

export function readInstalledPluginManifest(name, profileNodeModules) {
  if (typeof name !== 'string' || !/^dsh-[a-z0-9-]{2,60}$/.test(name)) return null;
  if (typeof profileNodeModules !== 'string' || !path.isAbsolute(profileNodeModules)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(profileNodeModules, name, 'package.json'), 'utf8'));
    return manifest.name === name ? manifest : null;
  } catch {
    return null;
  }
}
