var fs = require('fs')
var mkdirp = require('mkdirp')
var Koa = require('koa')
var Router = require('koa-router')
var bodyparser = require('koa-bodyparser')

let app = new Koa()
let router = new Router()
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
        textLimit: '50mb',
        onerror: function(err, ctx) {
            console.log(err.message)
            ctx.throw('body parse error', 422)
        },
    }),
)

// getting server status
router.get('/status', (ctx) => {
    ctx.status = 200
    ctx.body = 'running'
})

// get the backup folder location
router.get('/backup/location', (ctx) => {
    ctx.body = process.cwd()
    ctx.status = 200
})

// putting new files
router.put('/backup/:collection/:timestamp', (ctx) => {
    const filename = ctx.params.timestamp
    const collection = ctx.params.collection
    const dirpath = process.cwd() + `/backup/${collection}`
    mkdirp(dirpath, function(err) {
        if (err) throw err
        const filepath = dirpath + `/${filename}`
        fs.writeFile(filepath, ctx.request.body, function(err) {
            if (err) throw err
        })
    })
    ctx.status = 200
})

// getting files
router.get('/backup/:collection/:timestamp', (ctx) => {
    const filename = ctx.params.timestamp
    const collection = ctx.params.collection
    const filepath = process.cwd() + `/backup/${collection}/` + filename
    try {
        ctx.body = fs.readFileSync(filepath, 'utf-8')
    } catch (err) {
        if (err.code === 'ENOENT') {
            ctx.status = 404
            ctx.body = 'File not found.'
        } else throw err
    }
})

// listing files
router.get('/backup/:collection', (ctx) => {
    const collection = ctx.params.collection
    const dirpath = process.cwd() + `/backup/${collection}`
    try {
        let filelist = fs.readdirSync(dirpath, 'utf-8')
        filelist = filelist.filter( (filename) => {
            // check if filename contains digits only to ignore system files like .DS_STORE
            return /^\d+$/.test(filename)
        })
        ctx.body = filelist.toString()
    } catch (err) {
        if (err.code === 'ENOENT') {
            ctx.status = 404
            ctx.body = 'Collection not found.'
        } else throw err
    }
})

app.use(router.routes())
app.use(router.allowedMethods())
app.listen(port, function() {
    console.log('Server running on https://localhost:' + port)
})
