# @maxiedev/events

Event emitter with strong typing, async support, but not covering the basic EventEmitter API.

Features:
- ⚓ Strong typing
- 🚀 Async support
- 📦 No dependencies

## Installation

```bash
npm i @maxiedev/events
```

## Basic Usage

```typescript
import { createEmitter } from '@maxiedev/events';

const ee = createEmitter<{
    clientAdded: [id: number, name: string];
    clientRemoved: [id: number];
}>();

ee.on('clientAdded', (id, name) => { // <- id = number, name = string
    console.log(`Client ${name} added with id ${id}`);
});

ee.emit('clientAdded', 1, 'FooBarMan'); // <- forced to pass valid arguments
```

## API

```typescript
import { createEmitter } from '@maxiedev/events';

export type Options = {
    /**
     * Determines how errors are handled when they occur in a listener.
     * - `if-missing-listener`: Errors are thrown if there are no listeners for the event-errors (onError & offError)
     * - `always`: Errors are always thrown
     * - `never`: Errors are never thrown
     */
    throwErrors: 'if-missing-listener' | 'always' | 'never';
};

export type EventEmitter<Events extends Record<string, [...any]>> = {
    /**
     * Registers a listener for the specified event.
     */
    on<Name extends keyof Events>(
        name: Name,
        listener: (...args: Events[Name]) => void,
    ): () => void;

    /**
     * Registers a listener for the specified event that will be called at most once.
     */
    once<Name extends keyof Events>(
        name: Name,
        listener: (...args: Events[Name]) => void,
    ): () => void;

    /**
     * Emits the specified event with the given arguments.
     */
    emit<Name extends keyof Events>(
        name: Name,
        ...args: Events[Name],
    ): void;

    /**
     * Removes a listener for the specified event.
     */
    off<Name extends keyof Events>(
        name: Name,
        listener?: (...args: Events[Name]) => void,
    ): void;

    /**
     * Returns a promise that resolves when the specified event is emitted.
     */
    until<Name extends keyof Events>(
        name: Name,
    ): Promise<Events[Name]>;

    /**
     * Returns a promise that resolves when the specified event is emitted or the timeout is reached.
     */
    untilOrPass<Name extends keyof Events>(
        name: Name,
        timeout: number,
    ): Promise<Events[Name] | []>;

    /**
     * Returns a promise that resolves when the specified event is emitted or the timeout is reached.
     */
    untilOrThrow<Name extends keyof Events>(
        name: Name,
        timeout: number,
    ): Promise<Events[Name]>;

    /**
     * Returns an async generator that yields each time the specified event is emitted.
     */
    stream<Name extends keyof Events>(
        name: Name,
    ): AsyncGenerator<Events[Name]>;

    /**
     * Registers a listener for errors that occur in event listeners.
     */
    onError(listener: <T extends keyof Events>(
        eventName: T,
        eventArgs: Events[T],
        error: any,
    ) => void): void;

    /**
     * Removes a listener for errors that occur in event listeners.
     */
    offError(listener: <T extends keyof Events>(
        eventName: T,
        eventArgs: Events[T],
        error: any,
    ) => void): void;
};
```

## Examples

### Error handling

```typescript
import { createEmitter } from '@maxiedev/events';

const ee = createEmitter<{
    add: [num: number];
}>({
    throwErrors: 'if-missing-listener',
});

ee.on('add', (num) => {
    if (num < 0) {
        throw new Error('Negative numbers are not allowed');
    }
});

ee.emit('add', 1); // <- No error
ee.emit('add', -1); // <- Error: Negative numbers are not allowed

// but because of the `throwErrors: 'if-missing-listener'` option, we can catch the error:
ee.onError((name, args, error) => {
    console.error(`Error in event "${name}" with args ${args}: ${error.message}`);
});

// then the error will be caught:
ee.emit('add', -1); // <- No error, but above error handler will log the error
```

### Async support

Naive waiting for the first event:

```typescript
import { createEmitter } from '@maxiedev/events';

const ee = createEmitter<{
    add: [num: number];
}>();

const printAfterFirstChange = async () => {
    const [num] = await ee.until('add'); // <- Wait for the first from now `add` event occurs
    console.log(`Number changed to ${num}`);
};

printAfterFirstChange();

ee.emit('add', 1); // <- Number changed to 1
```

Timeout-able waiting for the first event:

```typescript
import { createEmitter } from '@maxiedev/events';

const ee = createEmitter<{
    add: [num: number];
}>();

const printAfterFirstChange = async () => {
    const [num] = await ee.untilOrPass('add', 1000); // <- Wait for the first from now `add` event occurs or 1 second
    if (num) {
        console.log(`Number changed to ${num}`);
    } else {
        console.log('Number not changed yet');
    }
};

printAfterFirstChange(); // <- Number not changed yet
```

Timeout-able waiting for the first event with error:

```typescript
import { createEmitter } from '@maxiedev/events';

const ee = createEmitter<{
    add: [num: number];
}>();

const printAfterFirstChange = async () => {
    const [num] = await ee.untilOrThrow('add', 1000); // <- Wait for the first from now `add` event occurs or 1 second
    console.log(`Number changed to ${num}`);
};

printAfterFirstChange(); // <- Throws an error after 1 second
```

### Generators

```typescript
import { createEmitter } from '@maxiedev/events';

const ee = createEmitter<{
    add: [num: number];
}>();

const printAfterChange = async () => {
    let sum = 0;

    for await (const [num] of ee.stream('add')) { // <- Wait for each `add` event occurs
        sum += num;
        console.log(`Number changed to ${num}`);

        if (sum >= 10) {
            break;
        }
    }
};

printAfterChange();

for (let i = 1; i <= 5; i++) {
    // We push 1..5 numbers to the `add` event:
    ee.emit('add', i); // <- Number changed to 1, 2, 3, 4, because the last number breaks the loop
}
```

## License

[LICENCE](./LICENSE)
