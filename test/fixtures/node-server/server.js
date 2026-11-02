const http = require('node:http')
const port = Number(process.env.PORT || 34679)
http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('fixture ok')
}).listen(port, '127.0.0.1', () => {
  console.log(`ready at http://localhost:${port}`)
})
