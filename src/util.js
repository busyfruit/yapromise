const toString = Object.prototype.toString

export const isFunction = (obj) => obj && toString.call(obj) === '[object Function]'

/**
 * ensure the functions be called only once
 * if more than one functions passed in,
 * the first call takes precedence, and any further calls are ignored
 */
export const ensureOnceCalled = (...args) => {

    let wrapper = fn => (...params) => {
        if (ret.isCalled) {
            return false
        }
        ret.isCalled = true
        fn.apply(null, params)
    }

    let ret = args.map(fn => {
        return wrapper(fn)
    })

    ret.isCalled = false
    
    return ret
}

/**
 * simulate nextTick in browser environment
 * */
export const nextTick = (() => {

    if (process && process.nextTick) {
        return (fn) => process.nextTick(fn)
    }

    let canPost = typeof window !== 'undefined' && window.postMessage && window.addEventListener

    if (canPost) {
        let queue = []

        window.addEventListener('message', (event) => {
            let source = event.source
            if ((source === window || source == null) && event.data === 'process-tick') {
                event.stopPropagation()
                if (queue.length > 0) {
                    let fn = queue.shift()
                    fn()
                }
            }
        }, true)

        return (fn) => {
            queue.push(fn)
            window.postMessage('process-tick', '*')
        }
    }
    else {
        return (fn) => setTimeout(fn, 0)
    }

})()

export default {isFunction, ensureOnceCalled, nextTick}
