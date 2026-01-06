import { parseCnp, validCnp } from '../lib/validatorsRo/cnp';

describe('Romanian CNP validation', () => {
  test('accepts a known-valid CNP (checksum, date, county)', () => {
    // Synthetic test CNP (not a real person's CNP)
    expect(validCnp('1800101400016')).toBe(true);
    expect(parseCnp('1800101400016')).toEqual(
      expect.objectContaining({
        valid: true,
        parsed: expect.objectContaining({
          sex: 'm',
          foreign_resident: false,
          date_of_birth: '1980-01-01',
          county_of_birth_code: '40',
        }),
      }),
    );
  });

  test('accepts leap-day dates when valid', () => {
    // Synthetic test CNP (not a real person's CNP)
    expect(validCnp('5040229521231')).toBe(true);
    const parsed = parseCnp('5040229521231');
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.parsed.date_of_birth).toBe('2004-02-29');
      expect(parsed.parsed.county_of_birth_code).toBe('52');
    }
  });

  test('allows spaces/dashes in input', () => {
    expect(validCnp('1800101-400016')).toBe(true);
    expect(validCnp('  1800101400016  ')).toBe(true);
  });

  test('rejects invalid checksum', () => {
    expect(validCnp('1800101400017')).toBe(false);
  });

  test('rejects invalid date', () => {
    // Feb 30 is invalid
    expect(validCnp('1800230400016')).toBe(false);
  });

  test('rejects invalid county code', () => {
    expect(validCnp('1800101000016')).toBe(false);
  });

  test('rejects NNN = 000', () => {
    // Same prefix as a valid one, but serial is 000
    expect(validCnp('1800101400000')).toBe(false);
  });

  test('accepts JJ=99 for born abroad', () => {
    // Synthetic test CNP (not a real person's CNP)
    expect(validCnp('7800101990015')).toBe(true);
    const parsed = parseCnp('7800101990015');
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.parsed.county_of_birth_code).toBe('99');
      expect(parsed.parsed.county_of_birth).toBe('Străinătate');
      expect(parsed.parsed.foreign_resident).toBe(true);
    }
  });
});

