import {isFunction, ensureOnceCalled, nextTick} from './util'

// save YaPromise private variables
const PRIVATE = Symbol('private variables')

const FULFILL = Symbol('fulfill')

const REJECT = Symbol('reject')

const STATUS_PENDING = Symbol('pending')

const STATUS_FULFILLED = Symbol('fulfilled')

const STATUS_REJECTED = Symbol('rejected')

const NOOP = () => {}

/**
 * promise A+ spec 2.3: The Promise Resolution Procedure
 */
const resolve = (promise, x) => {

    let privates = promise[PRIVATE]

    // promise A+ spec 2.3.1:
    // if promise and x refer to the same object,
    // reject promise with a TypeError as the reason
    if (promise === x) {
        let reason = new TypeError('the value cannot be the same with current promise')
        promise[REJECT](reason)
    }
    // promise A+ spec 2.3.2:
    // If x is a promise, adopt its state
    else if (x instanceof YaPromise) {
        let xPrivates = x[PRIVATE]

        // If x is pending, promise must remain pending until x is fulfilled or rejected.
        if (xPrivates.status === STATUS_PENDING) {
            x.then(promise[FULFILL].bind(promise), promise[REJECT].bind(promise))
        }
        // If/when x is fulfilled, fulfill promise with the same value.
        else if (xPrivates.status === STATUS_FULFILLED) {
            promise[FULFILL](xPrivates.value)
        }
        // If/when x is rejected, reject promise with the same reason.
        else if (xPrivates.status === STATUS_REJECTED) {
            promise[REJECT](xPrivates.reason)
        }
    }
    // promise A+ spec 2.3.3:
    // Otherwise, if x is an object or function
    else if ((x !== null && typeof x === 'object') || isFunction(x)) {
        let then
        try {
            then = x.then
        }
        // If retrieving the property x.then results in a thrown exception e,
        // reject promise with e as the reason.
        catch (ex) {
            return promise[REJECT](ex)
        }
        // If then is a function, call it with x as this,
        // first argument resolvePromise, and second argument rejectPromise, where:
        if (isFunction(then)) {

            // If/when resolvePromise is called with a value y, run [[Resolve]](promise, y).
            let resolvePromise = (y) => {
                resolve(promise, y)
            }
            // If/when rejectPromise is called with a reason r, reject promise with r.
            let rejectPromise = (r) => {
                promise[REJECT](r)
            }
            // If both resolvePromise and rejectPromise are called,
            // or multiple calls to the same argument are made,
            // the first call takes precedence, and any further calls are ignored.
            let onceCallArray = ensureOnceCalled(resolvePromise, rejectPromise)

            try {
                then.call(x, onceCallArray[0], onceCallArray[1])
            }
            // If calling then throws an exception e,
            catch (ex) {
                // If resolvePromise or rejectPromise have been called, ignore it.
                // Otherwise, reject promise with e as the reason.
                if (!onceCallArray.isCalled) {
                    promise[REJECT](ex)
                }
            }
        }
        // If then is not a function, fulfill promise with x.
        else {
            privates.value = x
            privates.status = STATUS_FULFILLED
        }
    }
    // If x is not an object or function, fulfill promise with x.
    else {
        privates.value = x
        privates.status = STATUS_FULFILLED
    }

    if (privates.status === STATUS_FULFILLED) {
        nextTick(executeContextQueue(promise))
    }
}

/**
 * execute onFulfilled or onRejected callbacks according to promise status
 */
const executeContextQueue = (promise) => {

    let privates = promise[PRIVATE]

    return () => {

        let {status, value, reason, thenContextQueue} = privates

        for (let context of thenContextQueue) {

            let {onFulfilled, onRejected, thenPromise} = context
            let x

            if (status === STATUS_FULFILLED) {
                if (onFulfilled) {
                    try {
                        // promise A+ spec 2.2.7.1:
                        // If either onFulfilled or onRejected returns a value x,
                        // run the Promise Resolution Procedure [[Resolve]](promise2, x).
                        x = onFulfilled(value)
                        resolve(thenPromise, x)
                    }
                    catch (ex) {
                        // promise A+ spec 2.2.7.2:
                        // If either onFulfilled or onRejected throws an exception e,
                        // promise2 must be rejected with e as the reason.
                        thenPromise[REJECT](ex)
                    }
                }
                else {
                    // promise A+ spec 2.2.7.3:
                    // If onFulfilled is not a function and promise1 is fulfilled,
                    // promise2 must be fulfilled with the same value as promise1.
                    thenPromise[FULFILL](value)
                }
            }

            else if (status === STATUS_REJECTED) {
                if (onRejected) {
                    try {
                        x = onRejected(reason)
                        resolve(thenPromise, x)
                    }
                    catch (ex) {
                        thenPromise[REJECT](ex)
                    }
                }
                else {
                    // promise A+ spec 2.2.7.4:
                    // If onRejected is not a function and promise1 is rejected,
                    // promise2 must be rejected with the same reason as promise1.
                    thenPromise[REJECT](reason)
                }
            }
        }

        // reset thenContextQueue
        privates.thenContextQueue = []
    }
}

export default class YaPromise {

    constructor (resolver) {

        if (!isFunction(resolver)) {
            throw new Error('YaPromise resolver must be a function')
        }

        this[PRIVATE] = {
            // save current status of promise
            status: STATUS_PENDING,
            // save the value when promise is fulfilled
            value: undefined,
            // save the exception when promise is rejected
            reason: undefined,
            // save the context when the then method is called,
            // a context is a object like {onFulfilled, onRejected, thenPromise}
            thenContextQueue: [],
        }

        resolver(this[FULFILL].bind(this), this[REJECT].bind(this))

    }

    [FULFILL] (value) {
        let privates = this[PRIVATE]
        if (privates.status !== STATUS_PENDING) {
            return NOOP
        }
        resolve(this, value)
    }

    [REJECT] (reason) {
        let privates = this[PRIVATE]
        if (privates.status !== STATUS_PENDING) {
            return NOOP
        }
        privates.status = STATUS_REJECTED
        privates.reason = reason
        nextTick(executeContextQueue(this))
    }

    then (onFulfilled, onRejected) {
        let privates = this[PRIVATE]
        let isValidOnFulfilled = isFunction(onFulfilled)
        let isValidOnRejected = isFunction(onRejected)
        let context = {}
        // promise A+ spec 2.2.7:
        // then must return a promise
        let thenPromise = new YaPromise(() => {})

        // promise A+ spec 2.2.6:
        // If/when promise is fulfilled(rejected),
        // all respective onFulfilled(onRejected) callbacks must execute
        // in the order of their originating calls to then
        if (privates.status !== STATUS_PENDING) {
            nextTick(executeContextQueue(this))
        }

        // save the context for next tick usage
        context.onFulfilled = isValidOnFulfilled && onFulfilled
        context.onRejected = isValidOnRejected && onRejected
        context.thenPromise = thenPromise
        privates.thenContextQueue.push(context)
        return thenPromise
    }

    /**
     * @TODO
     * implement some handy method that do not belong to the promise A+ spec
     * finally () {}
     * static when (aPromiseArray, callback) {}
     * static race (aPromiseArray, callback) {}
     */

    catch (onReject) {
        this.then(null, onReject)
    }

    /**
     * quickly get a resolved promise
     */
    static resolved (value) {
        return new YaPromise(fulfill => fulfill(value))
    }

    /**
     * quickly get a rejected promise
     */
    static rejected (reason) {
        return new YaPromise((fulfill, reject) => reject(reason))
    }

    static deferred () {
        let promise = new YaPromise(() => {})
        return {
            promise,
            resolve (value) {
                promise[FULFILL](value)

            },
            reject (reason) {
                promise[REJECT](reason)
            }
        }
    }
}
