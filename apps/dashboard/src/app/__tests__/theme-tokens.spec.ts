import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Design Tokens & Linear Academic Theme System', () => {
  it('defines telemetry and academic design tokens in tailwind.config.js', () => {
    const tailwindConfigPath = path.resolve(__dirname, '../../../tailwind.config.js');
    expect(fs.existsSync(tailwindConfigPath)).toBe(true);

    const configContent = fs.readFileSync(tailwindConfigPath, 'utf-8');
    expect(configContent).toContain('telemetry:');
    expect(configContent).toContain("'#06B6D4'"); // Cyan
    expect(configContent).toContain("'#6366F1'"); // Indigo
    expect(configContent).toContain("'#07090E'"); // Obsidian
    expect(configContent).toContain("'#0D121F'"); // Surface
    expect(configContent).toContain("'radar-pulse'");
  });

  it('defines dual-mode root and dark CSS custom properties in globals.css', () => {
    const globalsCssPath = path.resolve(__dirname, '../globals.css');
    expect(fs.existsSync(globalsCssPath)).toBe(true);

    const cssContent = fs.readFileSync(globalsCssPath, 'utf-8');

    // Light mode primary (Indigo 243 75% 59%)
    expect(cssContent).toContain('--primary: 243 75% 59%');

    // Dark mode obsidian background (225 33% 4.3%) and primary (Indigo 239 84% 67%)
    expect(cssContent).toContain('--background: 225 33% 4.3%');
    expect(cssContent).toContain('--primary: 239 84% 67%');

    // Futuristic hairline border & pulse utilities
    expect(cssContent).toContain('.futuristic-border');
    expect(cssContent).toContain('.radar-pulse-ring');
    expect(cssContent).toContain('.glow-cyan');
    expect(cssContent).toContain('.glow-indigo');
  });
});
