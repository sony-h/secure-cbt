import { describe, it, expect } from 'vitest';
import {
  reopenSessionSchema,
  authorizeRemedialSchema,
  bulkAuthorizeRemedialSchema,
} from '../session.schema';
import { SessionType, SocketEvent } from '../../enums';

describe('Session Reopen & Remedial Schemas', () => {
  it('defines SessionType enum with MAIN and REMEDIAL', () => {
    expect(SessionType.MAIN).toBe('MAIN');
    expect(SessionType.REMEDIAL).toBe('REMEDIAL');
  });

  it('defines SocketEvent for session reopened and remedial authorized', () => {
    expect(SocketEvent.SESSION_REOPENED).toBe('session.reopened');
    expect(SocketEvent.SESSION_REMEDIAL_AUTHORIZED).toBe('session.remedial_authorized');
  });

  it('validates reopenSessionSchema with valid payload', () => {
    const valid = {
      session_id: '123e4567-e89b-12d3-a456-426614174000',
      additional_minutes: 5,
      reset_strikes: true,
    };
    expect(reopenSessionSchema.parse(valid)).toEqual(valid);
  });

  it('allows reopenSessionSchema with default values', () => {
    const minimal = {
      session_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    const parsed = reopenSessionSchema.parse(minimal);
    expect(parsed.session_id).toBe(minimal.session_id);
    expect(parsed.reset_strikes).toBe(true);
    expect(parsed.additional_minutes).toBeUndefined();
  });

  it('rejects invalid UUID in reopenSessionSchema', () => {
    expect(() => reopenSessionSchema.parse({ session_id: 'not-a-uuid' })).toThrow();
  });

  it('validates authorizeRemedialSchema with valid payload', () => {
    const valid = {
      session_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(authorizeRemedialSchema.parse(valid)).toEqual(valid);
  });

  it('validates bulkAuthorizeRemedialSchema requires non-empty student_ids', () => {
    expect(() => bulkAuthorizeRemedialSchema.parse({ student_ids: [] })).toThrow();
    const valid = {
      student_ids: ['123e4567-e89b-12d3-a456-426614174000'],
    };
    expect(bulkAuthorizeRemedialSchema.parse(valid)).toEqual(valid);
  });
});
