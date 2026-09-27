import { describe, expect, it } from 'vitest';

import { parseStatementDate, shiftMonth } from '../dates';
import { parseAmountCents } from '../money';

describe('parseAmountCents', () => {
  it.each([
    ['-$17.58', -1758],
    ['$1,307.45', 130745],
    ['(12.50)', -1250],
    ['12.50 DR', -1250],
    ['12.50 CR', 1250],
    [17.58, 1758],
    ['', null],
    ['abc', null],
  ])('%s -> %s', (input, expected) => {
    expect(parseAmountCents(input)).toBe(expected);
  });
});

describe('parseStatementDate', () => {
  it.each([
    ['01 Sep 2026', '2026-09-01'],
    ['1-Sept-2026', '2026-09-01'],
    ['30/08/2026', '2026-08-30'],
    ['30/08/26', '2026-08-30'],
    ['2026-09-01', '2026-09-01'],
    [46266, '2026-09-01'],
    ['31/02/2026', null],
    ['Value Date', null],
  ])('%s -> %s', (input, expected) => {
    expect(parseStatementDate(input)).toBe(expected);
  });

  it('moves between months across year ends', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});
