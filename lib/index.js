'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _util = require('./util');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// save YaPromise private variables
var PRIVATE = Symbol('private variables');

var FULFILL = Symbol('fulfill');

var REJECT = Symbol('reject');

var STATUS_PENDING = Symbol('pending');

var STATUS_FULFILLED = Symbol('fulfilled');

var STATUS_REJECTED = Symbol('rejected');

var NOOP = function NOOP() {};

/**
 * promise A+ spec 2.3: The Promise Resolution Procedure
 */
var resolve = function resolve(promise, x) {

    var privates = promise[PRIVATE];

    // promise A+ spec 2.3.1:
    // if promise and x refer to the same object,
    // reject promise with a TypeError as the reason
    if (promise === x) {
        var reason = new TypeError('the value cannot be the same with current promise');
        promise[REJECT](reason);
    }
    // promise A+ spec 2.3.2:
    // If x is a promise, adopt its state
    else if (x instanceof YaPromise) {
            var xPrivates = x[PRIVATE];

            // If x is pending, promise must remain pending until x is fulfilled or rejected.
            if (xPrivates.status === STATUS_PENDING) {
                x.then(promise[FULFILL].bind(promise), promise[REJECT].bind(promise));
            }
            // If/when x is fulfilled, fulfill promise with the same value.
            else if (xPrivates.status === STATUS_FULFILLED) {
                    promise[FULFILL](xPrivates.value);
                }
                // If/when x is rejected, reject promise with the same reason.
                else if (xPrivates.status === STATUS_REJECTED) {
                        promise[REJECT](xPrivates.reason);
                    }
        }
        // promise A+ spec 2.3.3:
        // Otherwise, if x is an object or function
        else if (x !== null && (typeof x === 'undefined' ? 'undefined' : _typeof(x)) === 'object' || (0, _util.isFunction)(x)) {
                var then = void 0;
                try {
                    then = x.then;
                }
                // If retrieving the property x.then results in a thrown exception e,
                // reject promise with e as the reason.
                catch (ex) {
                    return promise[REJECT](ex);
                }
                // If then is a function, call it with x as this,
                // first argument resolvePromise, and second argument rejectPromise, where:
                if ((0, _util.isFunction)(then)) {

                    // If/when resolvePromise is called with a value y, run [[Resolve]](promise, y).
                    var resolvePromise = function resolvePromise(y) {
                        resolve(promise, y);
                    };
                    // If/when rejectPromise is called with a reason r, reject promise with r.
                    var rejectPromise = function rejectPromise(r) {
                        promise[REJECT](r);
                    };
                    // If both resolvePromise and rejectPromise are called,
                    // or multiple calls to the same argument are made,
                    // the first call takes precedence, and any further calls are ignored.
                    var onceCallArray = (0, _util.ensureOnceCalled)(resolvePromise, rejectPromise);

                    try {
                        then.call(x, onceCallArray[0], onceCallArray[1]);
                    }
                    // If calling then throws an exception e,
                    catch (ex) {
                        // If resolvePromise or rejectPromise have been called, ignore it.
                        // Otherwise, reject promise with e as the reason.
                        if (!onceCallArray.isCalled) {
                            promise[REJECT](ex);
                        }
                    }
                }
                // If then is not a function, fulfill promise with x.
                else {
                        privates.value = x;
                        privates.status = STATUS_FULFILLED;
                    }
            }
            // If x is not an object or function, fulfill promise with x.
            else {
                    privates.value = x;
                    privates.status = STATUS_FULFILLED;
                }

    if (privates.status === STATUS_FULFILLED) {
        (0, _util.nextTick)(executeContextQueue(promise));
    }
};

/**
 * execute onFulfilled or onRejected callbacks according to promise status
 */
var executeContextQueue = function executeContextQueue(promise) {

    var privates = promise[PRIVATE];

    return function () {
        var status = privates.status;
        var value = privates.value;
        var reason = privates.reason;
        var thenContextQueue = privates.thenContextQueue;
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {

            for (var _iterator = thenContextQueue[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var context = _step.value;
                var onFulfilled = context.onFulfilled;
                var onRejected = context.onRejected;
                var thenPromise = context.thenPromise;

                var x = void 0;

                if (status === STATUS_FULFILLED) {
                    if (onFulfilled) {
                        try {
                            // promise A+ spec 2.2.7.1:
                            // If either onFulfilled or onRejected returns a value x,
                            // run the Promise Resolution Procedure [[Resolve]](promise2, x).
                            x = onFulfilled(value);
                            resolve(thenPromise, x);
                        } catch (ex) {
                            // promise A+ spec 2.2.7.2:
                            // If either onFulfilled or onRejected throws an exception e,
                            // promise2 must be rejected with e as the reason.
                            thenPromise[REJECT](ex);
                        }
                    } else {
                        // promise A+ spec 2.2.7.3:
                        // If onFulfilled is not a function and promise1 is fulfilled,
                        // promise2 must be fulfilled with the same value as promise1.
                        thenPromise[FULFILL](value);
                    }
                } else if (status === STATUS_REJECTED) {
                    if (onRejected) {
                        try {
                            x = onRejected(reason);
                            resolve(thenPromise, x);
                        } catch (ex) {
                            thenPromise[REJECT](ex);
                        }
                    } else {
                        // promise A+ spec 2.2.7.4:
                        // If onRejected is not a function and promise1 is rejected,
                        // promise2 must be rejected with the same reason as promise1.
                        thenPromise[REJECT](reason);
                    }
                }
            }

            // reset thenContextQueue
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        privates.thenContextQueue = [];
    };
};

var YaPromise = function () {
    function YaPromise(resolver) {
        _classCallCheck(this, YaPromise);

        if (!(0, _util.isFunction)(resolver)) {
            throw new Error('YaPromise resolver must be a function');
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
            thenContextQueue: []
        };

        resolver(this[FULFILL].bind(this), this[REJECT].bind(this));
    }

    _createClass(YaPromise, [{
        key: FULFILL,
        value: function value(_value) {
            var privates = this[PRIVATE];
            if (privates.status !== STATUS_PENDING) {
                return NOOP;
            }
            resolve(this, _value);
        }
    }, {
        key: REJECT,
        value: function value(reason) {
            var privates = this[PRIVATE];
            if (privates.status !== STATUS_PENDING) {
                return NOOP;
            }
            privates.status = STATUS_REJECTED;
            privates.reason = reason;
            (0, _util.nextTick)(executeContextQueue(this));
        }
    }, {
        key: 'then',
        value: function then(onFulfilled, onRejected) {
            var privates = this[PRIVATE];
            var isValidOnFulfilled = (0, _util.isFunction)(onFulfilled);
            var isValidOnRejected = (0, _util.isFunction)(onRejected);
            var context = {};
            // promise A+ spec 2.2.7:
            // then must return a promise
            var thenPromise = new YaPromise(function () {});

            // promise A+ spec 2.2.6:
            // If/when promise is fulfilled(rejected),
            // all respective onFulfilled(onRejected) callbacks must execute
            // in the order of their originating calls to then
            if (privates.status !== STATUS_PENDING) {
                (0, _util.nextTick)(executeContextQueue(this));
            }

            // save the context for next tick usage
            context.onFulfilled = isValidOnFulfilled && onFulfilled;
            context.onRejected = isValidOnRejected && onRejected;
            context.thenPromise = thenPromise;
            privates.thenContextQueue.push(context);
            return thenPromise;
        }

        /**
         * @TODO
         * implement some handy method that do not belong to the promise A+ spec
         * finally () {}
         * static when (aPromiseArray, callback) {}
         * static race (aPromiseArray, callback) {}
         */

    }, {
        key: 'catch',
        value: function _catch(onReject) {
            this.then(null, onReject);
        }

        /**
         * quickly get a resolved promise
         */

    }], [{
        key: 'resolved',
        value: function resolved(value) {
            return new YaPromise(function (fulfill) {
                return fulfill(value);
            });
        }

        /**
         * quickly get a rejected promise
         */

    }, {
        key: 'rejected',
        value: function rejected(reason) {
            return new YaPromise(function (fulfill, reject) {
                return reject(reason);
            });
        }
    }, {
        key: 'deferred',
        value: function deferred() {
            var promise = new YaPromise(function () {});
            return {
                promise: promise,
                resolve: function resolve(value) {
                    promise[FULFILL](value);
                },
                reject: function reject(reason) {
                    promise[REJECT](reason);
                }
            };
        }
    }]);

    return YaPromise;
}();

exports.default = YaPromise;