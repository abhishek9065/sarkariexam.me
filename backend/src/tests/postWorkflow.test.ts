import { describe, expect, it } from 'vitest';

import PostModelMongo from '../models/posts.mongo.js';

const resolveNextStatus = (current: string, action: string) =>
  (PostModelMongo as any).resolveNextStatus(current, action);

describe('Post workflow transitions', () => {
  it('enforces the editorial approval chain', () => {
    expect(resolveNextStatus('draft', 'submit')).toBe('in_review');
    expect(resolveNextStatus('in_review', 'approve')).toBe('approved');
    expect(resolveNextStatus('approved', 'publish')).toBe('published');
    expect(resolveNextStatus('published', 'unpublish')).toBe('approved');
    expect(resolveNextStatus('published', 'archive')).toBe('archived');
    expect(resolveNextStatus('archived', 'restore')).toBe('draft');
  });

  it('rejects invalid status transitions', () => {
    expect(() => resolveNextStatus('draft', 'approve')).toThrow('Only content in review can be approved');
    expect(() => resolveNextStatus('draft', 'publish')).toThrow('Only approved content can be published');
    expect(() => resolveNextStatus('in_review', 'archive')).toThrow('Only approved or published content can be archived');
    expect(() => resolveNextStatus('approved', 'restore')).toThrow('Only archived content can be restored');
  });
});

