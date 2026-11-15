import {
  isTemplateKey,
  validateColor,
  validateDescription,
  validateIcon,
  validateName,
} from '../catalog';
import { isUserId } from '../ids';

const code = (task: () => unknown) => {
  try {
    task();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
};

describe('catalog rules (O-027)', () => {
  it('trims names and limits them to 60 code points', () => {
    expect(validateName('  Ayşe  ')).toBe('Ayşe');
    expect(validateName('ş'.repeat(60))).toHaveLength(60);
    expect(code(() => validateName(' \n '))).toBe('name-required');
    expect(code(() => validateName('a'.repeat(61)))).toBe('name-too-long');
  });

  it('turns a blank description into null', () => {
    expect(validateDescription(undefined)).toBeNull();
    expect(validateDescription('  ')).toBeNull();
    expect(validateDescription(' text ')).toBe('text');
    expect(code(() => validateDescription('a'.repeat(10_001)))).toBe('description-too-long');
  });

  it('accepts only #RRGGBB colors', () => {
    expect(validateColor(null)).toBeNull();
    expect(validateColor('#5d2a42')).toBe('#5D2A42');
    for (const bad of ['5D2A42', '#5D2A4', '#5D2A42FF', 'red']) {
      expect(code(() => validateColor(bad))).toBe('invalid-color');
    }
  });

  it('accepts icon identifiers only', () => {
    expect(validateIcon('home-outline')).toBe('home-outline');
    for (const bad of ['', 'Home', 'home outline', '-home', 'a'.repeat(65)]) {
      expect(code(() => validateIcon(bad))).toBe('invalid-icon');
    }
  });

  it('recognizes templates and user IDs', () => {
    expect(isTemplateKey('TASK')).toBe(true);
    expect(isTemplateKey('task')).toBe(false);
    expect(isUserId('6f1c1d36-5b0e-4a51-9a4e-0d6c2f6b1a01')).toBe(true);
    expect(isUserId('4d454d30-0000-8000-8000-000000000001')).toBe(false);
  });
});
