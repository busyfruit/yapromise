var Promise = require('../lib/index.js').default
var promisesAplusTests = require('promises-aplus-tests')
var adapter = {
    resolved: Promise.resolved,
    rejected: Promise.rejected,
    deferred: Promise.deferred
}

promisesAplusTests(adapter, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
    if (err) {
        console.log(err)
    }
    else {
        console.log('success')
    }
})
