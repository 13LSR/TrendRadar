import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreference, writePreference } from './preferences.js';

const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('completed visits and theme choices survive with persistent storage', () => {
  const localStorage = storage();
  writePreference('test-visit', 'seen', { localStorage });
  writePreference('test-theme', 'dark', { localStorage });
  assert.equal(readPreference('test-visit', { localStorage }), 'seen');
  assert.equal(readPreference('test-theme', { localStorage }), 'dark');
  assert.equal(readPreference('test-new-visitor', { localStorage }), null);
});

test('denied persistent storage falls back to session storage', () => {
  const sessionStorage = storage();
  const host = { get localStorage() { throw new Error('Denied'); }, sessionStorage };
  writePreference('test-session-visit', 'seen', host);
  assert.equal(sessionStorage.getItem('test-session-visit'), 'seen');
  assert.equal(readPreference('test-session-visit', host), 'seen');
});

test('blocking all browser storage does not prevent reading or theme changes', () => {
  const host = {
    get localStorage() { throw new Error('Denied'); },
    get sessionStorage() { throw new Error('Denied'); },
  };
  assert.doesNotThrow(() => writePreference('test-memory-theme', 'dark', host));
  assert.equal(readPreference('test-memory-theme', host), 'dark');
  writePreference('test-memory-theme', 'light', host);
  assert.equal(readPreference('test-memory-theme', host), 'light');
});
