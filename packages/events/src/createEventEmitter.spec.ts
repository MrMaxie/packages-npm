import { describe, it, expect } from 'vitest';
import { createEventEmitter } from './createEventEmitter';

const wait = (ms = 10) => new Promise(resolve => setTimeout(resolve, ms));

describe('createEventEmitter', () => {
    it('should create an event emitter', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener = () => count++;

        ee.on('event', listener);
        ee.emit('event');

        expect(count).toBe(1);
    });

    it('should allows add multiple listeners for the same event', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener1 = () => count++;
        const listener2 = () => count++;

        ee.on('event', listener1);
        ee.on('event', listener2);
        ee.emit('event');

        expect(count).toBe(2);
    });

    it('should allows add multiple listeners for different events', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener1 = () => count++;
        const listener2 = () => count -= 2;

        ee.on('event1', listener1);
        ee.on('event2', listener2);
        ee.emit('event1');
        ee.emit('event2');

        expect(count).toBe(-1);
    });

    it('should returns a function to remove the listener when adding a listener', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener = () => count++;

        const off = ee.on('event', listener);
        ee.emit('event');

        expect(count).toBe(1);

        off();
        ee.emit('event');

        expect(count).toBe(1);
    });

    it('should allows add a listener that will be called only once', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener = () => count++;

        ee.once('event', listener);
        ee.emit('event');
        ee.emit('event');

        expect(count).toBe(1);
    });

    it('should returns a function to remove the listener when adding a listener that will be called only once', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener = () => count++;

        const off = ee.once('event', listener);

        expect(count).toBe(0);

        off();
        ee.emit('event');

        expect(count).toBe(0);
    });

    it('should allows remove a listener by only name', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener = () => count++;

        ee.on('event', listener);
        ee.emit('event');

        expect(count).toBe(1);

        ee.once('event', listener);
        ee.off('event');
        ee.emit('event');

        expect(count).toBe(1);
    });

    it('should allows remove a listener by function reference', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener = () => count++;

        ee.on('event', listener);
        ee.emit('event');

        expect(count).toBe(1);

        ee.off('event', listener);
        ee.emit('event');

        expect(count).toBe(1);
    });

    it('should allows remove a listener even if it was added with once', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener = () => count++;
        ee.once('event', listener);

        expect(count).toBe(0);

        ee.off('event', listener);
        ee.emit('event');

        expect(count).toBe(0);
    });

    it('should emit the event to all listeners', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener1 = () => count++;
        const listener2 = () => count++;

        ee.on('event', listener1);
        ee.once('event', listener2);
        ee.emit('event');

        expect(count).toBe(2);
    });

    it('should emit the event with the arguments', () => {
        const ee = createEventEmitter();
        let count = 0;
        const listener = (a: number, b: number) => count = a + b;

        ee.on('event', listener);
        ee.emit('event', 1, 2);

        expect(count).toBe(3);
    });

    it('should return a promise that resolves when the event is emitted', async () => {
        const ee = createEventEmitter();
        let count = 0;
        const addOneAsync = async () => {
            await ee.until('event');
            count++;
        };

        addOneAsync();
        ee.emit('event');

        await wait();
        expect(count).toBe(1);
    });

    it('should return a promise that resolves with the arguments when the event is emitted', async () => {
        const ee = createEventEmitter();
        let count = 0;
        const addAsync = async () => {
            const [a, b] = await ee.until('event');
            count = a + b;
        };

        addAsync();
        ee.emit('event', 1, 2);

        await wait();
        expect(count).toBe(3);
    });

    it('should allows to set a timeout for the promise that resolves when the event is emitted', async () => {
        const ee = createEventEmitter();
        let count = 0;
        const addOneAsync = async () => {
            await ee.untilOrPass('event', 100);
            count = 1;
            expect(count).toBe(1);
        };

        const p = addOneAsync();

        await wait(20);
        expect(count).toBe(0);

        await p;
    });

    it('should allows to set a timeout for the promise that resolves with the arguments when the event is emitted', async () => {
        const ee = createEventEmitter();
        let count = 0;
        const addAsync = async () => {
            const [a, b] = await ee.untilOrPass('event', 100);
            count = a + b;
            expect(count).toBe(3);
            return [a, b];
        };

        const p = addAsync();

        await wait(20);
        expect(count).toBe(0);

        ee.emit('event', 1, 2);

        expect(p).resolves.toEqual([1, 2]);
    });

    it('should allows to set a timeout for the promise that rejects when the event is not emitted', async () => {
        const ee = createEventEmitter();
        let count = 0;
        const addOneAsync = async () => {
            await ee.untilOrThrow('event', 100);
            count = 1;
        };

        const p = addOneAsync();

        await expect(p).rejects.toThrow('Timeout waiting for event "event"');
        expect(count).toBe(0);
    });

    it('should allows to set a timeout for the promise that rejects with the error when the event is not emitted', async () => {
        const ee = createEventEmitter();
        let count = 0;
        const addAsync = async () => {
            const [a, b] = await ee.untilOrThrow('event', 100);
            count = a + b;
            return [a, b];
        };

        const p = addAsync();
        ee.emit('event', 1, 2);

        await expect(p).resolves.toEqual([1, 2]);
        expect(count).toBe(3);
    });

    it('should allows create generator that yields the event arguments', async () => {
        const ee = createEventEmitter();
        let count = 0;

        const consumeStream = async () => {
            for await (const [a, b] of ee.stream('event')) {
                count = a + b;
            }
        };

        consumeStream();

        ee.emit('event', 1, 2);

        await wait();

        expect(count).toBe(3);

        ee.emit('event', 3, 4);

        await wait();

        expect(count).toBe(7);
    });

    it('should allows setup a listener for errors', async () => {
        const ee = createEventEmitter({
            throwErrors: 'if-missing-listener',
        });
        let erroredEventName = '';

        ee.onError(name => {
            erroredEventName = name;
        });

        ee.on('test', () => {
            throw new Error('test error');
        });

        ee.emit('test');

        expect(erroredEventName).toBe('test');
    });

    it('should allows to catch the errors from once too', async () => {
        const ee = createEventEmitter({
            throwErrors: 'if-missing-listener',
        });
        let erroredEventName = '';

        ee.onError(name => {
            erroredEventName = name;
        });

        ee.once('test', () => {
            throw new Error('test error');
        });

        ee.emit('test');

        expect(erroredEventName).toBe('test');
    });

    it('should allows remove a listener for errors', async () => {
        const ee = createEventEmitter({
            throwErrors: 'never',
        });
        let erroredEventName = '';

        const listener = (name: string) => {
            erroredEventName = name;
        };

        ee.onError(listener);

        ee.on('test', () => {
            throw new Error('test error');
        });

        ee.on('test2', () => {
            throw new Error('test2 error');
        });

        ee.emit('test');

        expect(erroredEventName).toBe('test');

        ee.offError(listener);

        ee.emit('test2');

        expect(erroredEventName).toBe('test');
    });

    it('should never throw real error if throwing is set to "never"', async () => {
        const ee = createEventEmitter({
            throwErrors: 'never',
        });

        ee.on('test', () => {
            throw new Error('test error');
        });

        expect(() => ee.emit('test')).not.toThrow();
    });

    it('should throw real error if throwing is set to "always"', async () => {
        const ee = createEventEmitter({
            throwErrors: 'always',
        });

        ee.onError(() => {});

        ee.on('test', () => {
            throw new Error('test error');
        });

        expect(() => ee.emit('test')).toThrow('test error');
    });

    it('should throw real error if throwing is set to "if-missing-listener" and no listener is set', async () => {
        const ee = createEventEmitter({
            throwErrors: 'if-missing-listener',
        });

        ee.on('test', () => {
            throw new Error('test error');
        });

        expect(() => ee.emit('test')).toThrow('test error');

        ee.onError(() => {});

        expect(() => ee.emit('test')).not.toThrow();
    });
});
