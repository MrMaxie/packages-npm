import { describe, it, expect } from 'vitest';
import { createEventEmitter } from './createEventEmitter';
import * as Main from './main';

describe('main', () => {
    it('should re-export createEventEmitter', () => {
        expect(Main.createEventEmitter).toBe(createEventEmitter);
    });

    it('should re-export createEventEmitter and rename into createEmitter', () => {
        expect(Main.createEmitter).toBe(createEventEmitter);
    });
});