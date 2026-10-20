import test from 'node:test';
import assert from 'node:assert/strict';
import { findUntestedPlugins, readInstalledPluginManifest } from '../compatibility.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const manifests = [
  { name: 'dsh-channel-core', dshCompatibility: { testedRuntime: '0.2.1-rc.2', policy: 'warn' } },
  { name: 'dsh-memory-dreaming', dshCompatibility: { testedRuntime: '0.2.1-rc.2', policy: 'warn' } },
  { name: 'dsh-plugin-diagnostics', dshCompatibility: { testedRuntime: '0.2.1-rc.2', policy: 'warn' } },
];

test('exact tested runtime has no compatibility warning', () => {
  assert.deepEqual(findUntestedPlugins(manifests, '0.2.1-rc.2'), []);
});

test('newer runtime mismatch is advisory metadata and does not mutate or reject plugins', () => {
  assert.deepEqual(findUntestedPlugins(manifests, '0.2.2-rc.1'), [
    { name: 'dsh-channel-core', testedRuntime: '0.2.1-rc.2', runtimeVersion: '0.2.2-rc.1' },
    { name: 'dsh-memory-dreaming', testedRuntime: '0.2.1-rc.2', runtimeVersion: '0.2.2-rc.1' },
    { name: 'dsh-plugin-diagnostics', testedRuntime: '0.2.1-rc.2', runtimeVersion: '0.2.2-rc.1' },
  ]);
});

test('missing, malformed, or non-warning metadata is ignored safely', () => {
  assert.deepEqual(findUntestedPlugins([
    null,
    { name: 'dsh-good', dshCompatibility: { testedRuntime: 'not-a-version', policy: 'warn' } },
    { name: 'dsh-good', dshCompatibility: { testedRuntime: '0.2.1-rc.2', policy: 'block' } },
    { name: '../outside', dshCompatibility: { testedRuntime: '0.2.1-rc.2', policy: 'warn' } },
  ], '0.2.2-rc.1'), []);
});

test('reads a named plugin manifest from the current desktop profile', async (t) => {
  const modules = await mkdtemp(join(tmpdir(), 'dsh-compat-test-'));
  t.after(() => rm(modules, { recursive: true, force: true }));
  await mkdir(join(modules, 'dsh-channel-core'));
  await writeFile(join(modules, 'dsh-channel-core', 'package.json'), JSON.stringify({
    name: 'dsh-channel-core',
    version: '0.4.63',
    dshCompatibility: { testedRuntime: '0.2.1-rc.2', policy: 'warn' }
  }));
  assert.equal(readInstalledPluginManifest('dsh-channel-core', modules)?.version, '0.4.63');
  assert.equal(readInstalledPluginManifest('../unrelated', modules), null);
  assert.equal(readInstalledPluginManifest('dsh-memory-dreaming', modules), null);
});
