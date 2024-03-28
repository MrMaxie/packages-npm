/**
 * Options for the event emitter.
 */
export type Options = {
    /**
     * Determines how errors are handled when they occur in a listener.
     * - `if-missing-listener`: Errors are thrown if there are no listeners for the event.
     * - `always`: Errors are always thrown.
     * - `never`: Errors are never thrown.
     */
    throwErrors: 'if-missing-listener' | 'always' | 'never';
};

export type EventEmitter<Events extends Record<string, [...any]>> = {
    /**
     * Registers a listener for the specified event.
     *
     * @param {keyof Events} name - The name of the event to listen for.
     * @param {(...args: Events[Name]) => void} listener - The listener function to call when the event is emitted.
     * @returns {() => void} - A function that can be called to remove the listener.
     */
    on<Name extends keyof Events>(name: Name, listener: (...args: Events[Name]) => void): () => void;

    /**
     * Registers a listener for the specified event that will be called at most once.
     *
     * @param {keyof Events} name - The name of the event to listen for.
     * @param {(...args: Events[Name]) => void} listener - The listener function to call when the event is emitted.
     * @returns {() => void} - A function that can be called to remove the listener.
     */
    once<Name extends keyof Events>(name: Name, listener: (...args: Events[Name]) => void): () => void;

    /**
     * Emits the specified event with the given arguments.
     *
     * @param {keyof Events} name - The name of the event to emit.
     * @param {...Events[Name]} args - The arguments to pass to the event listeners.
     */
    emit<Name extends keyof Events>(name: Name, ...args: Events[Name]): void;

    /**
     * Removes a listener for the specified event.
     *
     * @param {keyof Events} name - The name of the event to remove the listener from.
     * @param {(...args: Events[Name]) => void} [listener] - The listener function to remove. If not specified, all listeners for the event are removed.
     */
    off<Name extends keyof Events>(name: Name, listener?: (...args: Events[Name]) => void): void;

    /**
     * Returns a promise that resolves when the specified event is emitted.
     *
     * @param {keyof Events} name - The name of the event to wait for.
     * @returns {Promise<Events[Name]>} - A promise that resolves with the arguments passed to the event listeners.
     */
    until<Name extends keyof Events>(name: Name): Promise<Events[Name]>;

    /**
     * Returns a promise that resolves when the specified event is emitted or the timeout is reached.
     *
     * @param {keyof Events} name - The name of the event to wait for.
     * @param {number} timeout - The maximum time to wait for the event in milliseconds.
     * @returns {Promise<Events[Name] | []} - A promise that resolves with the arguments passed to the event listeners, or an empty array if the timeout is reached.
     */
    untilOrPass<Name extends keyof Events>(name: Name, timeout: number): Promise<Events[Name] | []>;

    /**
     * Returns a promise that resolves when the specified event is emitted or the timeout is reached.
     *
     * @param {keyof Events} name - The name of the event to wait for.
     * @param {number} timeout - The maximum time to wait for the event in milliseconds.
     * @returns {Promise<Events[Name]} - A promise that resolves with the arguments passed to the event listeners.
     */
    untilOrThrow<Name extends keyof Events>(name: Name, timeout: number): Promise<Events[Name]>;

    /**
     * Returns an async generator that yields each time the specified event is emitted.
     *
     * @param {keyof Events} name - The name of the event to stream.
     * @returns {AsyncGenerator<Events[Name]>} - An async generator that yields the arguments passed to the event listeners.
     */
    stream<Name extends keyof Events>(name: Name): AsyncGenerator<Events[Name]>;

    /**
     * Registers a listener for errors that occur in event listeners.
     *
     * @param {(eventName: keyof Events, eventArgs: Events[keyof Events], error: any) => void} listener - The listener function to call when an error occurs.
     */
    onError(listener: <T extends keyof Events>(eventName: T, eventArgs: Events[T], error: any) => void): void;

    /**
     * Removes a listener for errors that occur in event listeners.
     *
     * @param {(eventName: keyof Events, eventArgs: Events[keyof Events], error: any) => void} listener - The listener function to remove.
     */
    offError(listener: <T extends keyof Events>(eventName: T, eventArgs: Events[T], error: any) => void): void;
};

/**
 * Creates an event emitter object that allows registering listeners for specific events and emitting those events.
 *
 * @template Events - A type representing the events and their corresponding argument types.
 * @param {Partial<Options>} [options] - Optional configuration options for the event emitter.
 * @returns {EventEmitter<Events>} - The event emitter object.
 */
export const createEventEmitter = <Events extends Record<string, [...any]>>(options?: Partial<Options>) => {
    options = Object.assign({
        throwErrors: 'if-missing-listener',
    }, options) as Options;

    const onList: Partial<{
        [Name in keyof Events]: Array<(...args: Events[Name]) => void>;
    }> = {};

    const onceList: Partial<{
        [Name in keyof Events]: Array<(...args: Events[Name]) => void>;
    }> = {};

    const onErrors: Array<<T extends keyof Events>(eventName: T, eventArgs: Events[T], error: any) => void> = [];

    const emitError = <T extends keyof Events>(eventName: T, eventArgs: Events[T], error: any) => {
        const newError = Object.assign(error, {
            eventName,
            eventArgs,
        });

        if (onErrors.length === 0 && options.throwErrors === 'if-missing-listener') {
            throw newError;
        }

        if (onErrors.length > 0) {
            onErrors.forEach(listener => listener(eventName, eventArgs, newError));
        }

        if (options.throwErrors === 'always') {
            throw newError;
        }
    };

    const ee = Object.freeze({
        on<Name extends keyof Events>(name: Name, listener: (...args: Events[Name]) => void) {
            if (!onList[name]) {
                onList[name] = [];
            }

            onList[name]!.push(listener);

            return () => {
                ee.off(name, listener);
            };
        },

        once<Name extends keyof Events>(name: Name, listener: (...args: Events[Name]) => void) {
            if (!onceList[name]) {
                onceList[name] = [];
            }

            onceList[name]!.push(listener);

            return () => {
                ee.off(name, listener);
            };
        },

        emit<Name extends keyof Events>(name: Name, ...args: Events[Name]) {
            if (onList[name]) {
                onList[name]!.forEach(listener => {
                    try {
                        listener(...args);
                    } catch (error) {
                        emitError(name, args, error);
                    }
                });
            }

            if (onceList[name]) {
                onceList[name]!.forEach(listener => {
                    try {
                        listener(...args);
                    } catch (error) {
                        emitError(name, args, error);
                    }
                });
                delete onceList[name];
            }
        },

        off<Name extends keyof Events>(name: Name, listener?: (...args: Events[Name]) => void) {
            const arrOn = onList[name];
            const arrOnce = onceList[name];

            if (arrOn) {
                if (listener === undefined) {
                    onList[name] = [];
                } else {
                    const i1 = arrOn.indexOf(listener);

                    if (i1 !== -1) {
                        arrOn.splice(i1, 1);
                    }
                }
            }

            if (arrOnce) {
                if (listener === undefined) {
                    onceList[name] = [];
                } else {
                    const i2 = arrOnce.indexOf(listener);

                    if (i2 !== -1) {
                        arrOnce.splice(i2, 1);
                    }
                }
            }
        },

        async until<Name extends keyof Events>(name: Name) {
            return new Promise<Events[Name]>(resolve => {
                ee.once(name, (...args) => {
                    resolve(args);
                });
            });
        },

        async untilOrPass<Name extends keyof Events>(name: Name, timeout: number) {
            return new Promise<Events[Name] | []>(resolve => {
                const timeoutId = setTimeout(() => {
                    resolve([]);
                }, timeout);

                ee.once(name, (...args) => {
                    clearTimeout(timeoutId);
                    resolve(args);
                });
            });
        },

        async untilOrThrow<Name extends keyof Events>(name: Name, timeout: number) {
            return new Promise<Events[Name]>(async (resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error(`Timeout waiting for event "${String(name)}"`));
                }, timeout);

                const args = await ee.until(name);
                clearTimeout(timeoutId);
                resolve(args);
            });
        },

        async *stream<Name extends keyof Events>(name: Name) {
            while (true) {
                yield await ee.until(name);
            }
        },

        onError(listener: <T extends keyof Events>(eventName: T, eventArgs: Events[T], error: any) => void) {
            onErrors.push(listener);
        },

        offError(listener: <T extends keyof Events>(eventName: T, eventArgs: Events[T], error: any) => void) {
            onErrors.splice(onErrors.indexOf(listener), 1);
        },
    });

    return ee as EventEmitter<Events>;
};
