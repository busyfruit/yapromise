'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var toString = Object.prototype.toString;

var isFunction = exports.isFunction = function isFunction(obj) {
    return obj && toString.call(obj) === '[object Function]';
};

/**
 * ensure the functions be called only once
 * if more than one functions passed in,
 * the first call takes precedence, and any further calls are ignored
 */
var ensureOnceCalled = exports.ensureOnceCalled = function ensureOnceCalled() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
    }

    var wrapper = function wrapper(fn) {
        return function () {
            for (var _len2 = arguments.length, params = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                params[_key2] = arguments[_key2];
            }

            if (ret.isCalled) {
                return false;
            }
            ret.isCalled = true;
            fn.apply(null, params);
        };
    };

    var ret = args.map(function (fn) {
        return wrapper(fn);
    });

    ret.isCalled = false;

    return ret;
};

/**
 * simulate nextTick in browser environment
 * */
var nextTick = exports.nextTick = function () {

    if (process && process.nextTick) {
        return function (fn) {
            return process.nextTick(fn);
        };
    }

    var canPost = typeof window !== 'undefined' && window.postMessage && window.addEventListener;

    if (canPost) {
        var _ret = function () {
            var queue = [];

            window.addEventListener('message', function (event) {
                var source = event.source;
                if ((source === window || source == null) && event.data === 'process-tick') {
                    event.stopPropagation();
                    if (queue.length > 0) {
                        var fn = queue.shift();
                        fn();
                    }
                }
            }, true);

            return {
                v: function v(fn) {
                    queue.push(fn);
                    window.postMessage('process-tick', '*');
                }
            };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    } else {
        return function (fn) {
            return setTimeout(fn, 0);
        };
    }
}();

exports.default = { isFunction: isFunction, ensureOnceCalled: ensureOnceCalled, nextTick: nextTick };