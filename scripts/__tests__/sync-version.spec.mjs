import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVersion,
  computeNextVersion,
  verifyFileContent,
  checkTargets,
  syncTargets,
} from '../sync-version.mjs';

describe('sync-version logic', () => {
  describe('parseVersion', () => {
    it('should parse valid SemVer strings', () => {
      const parsed = parseVersion('1.9.0');
      assert.deepEqual(parsed, { major: 1, minor: 9, patch: 0, prerelease: undefined, buildNumber: undefined });
    });

    it('should parse SemVer strings with build number', () => {
      const parsed = parseVersion('1.9.0+21');
      assert.deepEqual(parsed, { major: 1, minor: 9, patch: 0, prerelease: undefined, buildNumber: 21 });
    });

    it('should parse SemVer strings with prerelease tag', () => {
      const parsed = parseVersion('2.0.0-beta.1');
      assert.deepEqual(parsed, { major: 2, minor: 0, patch: 0, prerelease: 'beta.1', buildNumber: undefined });
    });

    it('should throw an error on invalid version strings', () => {
      assert.throws(() => parseVersion('invalid'), /Invalid SemVer version string/);
      assert.throws(() => parseVersion('1.2'), /Invalid SemVer version string/);
      assert.throws(() => parseVersion('v1.2.3'), /Invalid SemVer version string/);
    });
  });

  describe('computeNextVersion', () => {
    it('should compute patch bump correctly', () => {
      const result = computeNextVersion('1.9.0', 21, 'patch');
      assert.equal(result.version, '1.9.1');
      assert.equal(result.buildNumber, 22);
    });

    it('should compute minor bump correctly', () => {
      const result = computeNextVersion('1.9.0', 21, 'minor');
      assert.equal(result.version, '1.10.0');
      assert.equal(result.buildNumber, 22);
    });

    it('should compute major bump correctly', () => {
      const result = computeNextVersion('1.9.0', 21, 'major');
      assert.equal(result.version, '2.0.0');
      assert.equal(result.buildNumber, 22);
    });

    it('should allow explicit target version and explicit build number', () => {
      const result = computeNextVersion('1.9.0', 21, '2.0.0-rc.1', 30);
      assert.equal(result.version, '2.0.0-rc.1');
      assert.equal(result.buildNumber, 30);
    });

    it('should allow explicit target version with default build number increment', () => {
      const result = computeNextVersion('1.9.0', 21, '1.9.5');
      assert.equal(result.version, '1.9.5');
      assert.equal(result.buildNumber, 22);
    });
  });

  describe('verifyFileContent', () => {
    it('should update package.json version string correctly', () => {
      const original = JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2) + '\n';
      const updated = verifyFileContent('package.json', original, { version: '1.9.0', buildNumber: 21 });
      const parsed = JSON.parse(updated);
      assert.equal(parsed.version, '1.9.0');
    });

    it('should update pubspec.yaml version string correctly', () => {
      const original = 'name: mobile\nversion: 1.0.0+1\nenvironment:\n  sdk: ">=3.0.0"';
      const updated = verifyFileContent('pubspec.yaml', original, { version: '1.9.0', buildNumber: 21 });
      assert.match(updated, /version: 1\.9\.0\+21/);
    });

    it('should update app_info.dart version strings correctly', () => {
      const original = `
class AppInfo {
  static const String appName = 'Assessia';
  static const String fullName = 'Assessia by Orivastra';
  static const String version = '1.0.0';
  static const int buildNumber = 1;
  static const String versionString = '1.0.0+1';
}
      `.trim();
      const updated = verifyFileContent('app_info.dart', original, { version: '1.9.0', buildNumber: 21 });
      assert.match(updated, /static const String version = '1\.9\.0';/);
      assert.match(updated, /static const int buildNumber = 21;/);
      assert.match(updated, /static const String versionString = '1\.9\.0\+21';/);
    });

    it('should update version.ts constants correctly', () => {
      const original = `
export const APP_VERSION = '1.0.0';
export const APP_BUILD_NUMBER = 1;
export const APP_VERSION_STRING = '1.0.0+1';
      `.trim();
      const updated = verifyFileContent('version.ts', original, { version: '1.9.0', buildNumber: 21 });
      assert.match(updated, /export const APP_VERSION = '1\.9\.0';/);
      assert.match(updated, /export const APP_BUILD_NUMBER = 21;/);
      assert.match(updated, /export const APP_VERSION_STRING = '1\.9\.0\+21';/);
    });
  });

  describe('checkTargets and syncTargets on mock tree', () => {
    it('should accurately detect out-of-sync files and synchronize them', async () => {
      const os = await import('node:os');
      const fs = await import('node:fs');
      const path = await import('node:path');

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secure-cbt-sync-test-'));

      try {
        // Create mock targets
        fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'root', version: '1.0.0' }));
        fs.mkdirSync(path.join(tmpDir, 'packages/shared'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, 'packages/shared/package.json'), JSON.stringify({ name: 'shared', version: '1.0.0' }));
        fs.mkdirSync(path.join(tmpDir, 'apps/backend'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, 'apps/backend/package.json'), JSON.stringify({ name: 'backend', version: '1.0.0' }));
        fs.mkdirSync(path.join(tmpDir, 'apps/dashboard'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, 'apps/dashboard/package.json'), JSON.stringify({ name: 'dashboard', version: '1.0.0' }));
        fs.mkdirSync(path.join(tmpDir, 'apps/mobile'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, 'apps/mobile/pubspec.yaml'), 'name: mobile\nversion: 1.0.0+1');
        fs.mkdirSync(path.join(tmpDir, 'apps/mobile/lib/core/constants'), { recursive: true });
        fs.writeFileSync(
          path.join(tmpDir, 'apps/mobile/lib/core/constants/app_info.dart'),
          "class AppInfo {\n  static const String version = '1.0.0';\n  static const int buildNumber = 1;\n  static const String versionString = '1.0.0+1';\n}"
        );
        fs.mkdirSync(path.join(tmpDir, 'packages/shared/src/constants'), { recursive: true });
        fs.writeFileSync(
          path.join(tmpDir, 'packages/shared/src/constants/version.ts'),
          "export const APP_VERSION = '1.0.0';\nexport const APP_BUILD_NUMBER = 1;\nexport const APP_VERSION_STRING = '1.0.0+1';\n"
        );

        // Check before sync
        const checkBefore = checkTargets(tmpDir, { version: '1.9.0', buildNumber: 21 });
        assert.equal(checkBefore.inSync, false);
        assert.equal(checkBefore.errors.length, 7);

        // Run sync
        const syncResult = syncTargets(tmpDir, { version: '1.9.0', buildNumber: 21 });
        assert.ok(syncResult.updatedFiles.includes('version.json'));
        assert.ok(syncResult.updatedFiles.includes('package.json'));
        assert.ok(syncResult.updatedFiles.includes('apps/mobile/pubspec.yaml'));

        // Check after sync
        const checkAfter = checkTargets(tmpDir, { version: '1.9.0', buildNumber: 21 });
        assert.equal(checkAfter.inSync, true);
        assert.equal(checkAfter.errors.length, 0);

        // Check that version.json was created and matches
        const versionJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'version.json'), 'utf8'));
        assert.equal(versionJson.version, '1.9.0');
        assert.equal(versionJson.buildNumber, 21);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
