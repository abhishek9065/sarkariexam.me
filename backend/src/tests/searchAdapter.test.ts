import { describe, expect, it } from 'vitest';

import { mongoRegexSearchAdapter } from '../services/searchAdapter.js';

describe('mongoRegexSearchAdapter', () => {
  it('normalizes trimmed query values without changing supported filters', () => {
    expect(
      mongoRegexSearchAdapter.normalize({
        search: '  upsc  ',
        type: 'result',
        category: '  central  ',
        state: '  delhi ',
        organization: ' ssc ',
        qualification: ' graduate ',
      }),
    ).toEqual({
      search: 'upsc',
      type: 'result',
      category: 'central',
      state: 'delhi',
      organization: 'ssc',
      qualification: 'graduate',
    });
  });
});
