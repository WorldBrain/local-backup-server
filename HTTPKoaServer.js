var fs = require('fs')
var Koa = require('koa')
var Router = require('koa-router')
var bodyparser = require('koa-bodyparser')
let app = new Koa()
let router = new Router({ prefix: '' })

const port = 11922

// error handling
app.use(async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        ctx.status = err.status || 500
        ctx.body = err.message
        ctx.app.emit('error', err, ctx)
    }
})

// body parsing
app.use(
    bodyparser({
        enableTypes: ['text'],
        onerror: function(err, ctx) {
            console.log(err.message)
            ctx.throw('body parse error', 422)
        },
    }),
)

// putting new files
router.put('/change-sets/:date', (ctx, next) => {
    const filename = ctx.params.date
    const path = process.cwd() + '/' + filename
    fs.writeFile(path, ctx.request.body, function(err) {
        if (err) throw err
    })
    ctx.status = 200
})

app.use(router.routes())
app.use(router.allowedMethods())
app.listen(port, function() {
    console.log('Server running on https://localhost:' + port)
})
