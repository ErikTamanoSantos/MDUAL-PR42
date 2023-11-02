const express = require('express')
const shadowsObj = require('./utilsShadows.js')
const webSockets = require('./utilsWebSockets.js')

/*
    WebSockets server, example of messages:

    From client to server:
        - Choosen cell          { "type": "movement", "cell", 0 }

    From server to client:
        - Opponent              { "type": "opponent", "name": "001" }
        - Movement              { "type": "movement", "board": [] }
        - YourTurn              { "type": "yourTurn" }
        - Game Over             { "type": "gameOver", "winner": "001", "board": [] }
 */

var ws = new webSockets()
let shadows = new shadowsObj()

// Start HTTP server
const app = express()
const port = process.env.PORT || 8888

// Publish static files from 'public' folder
app.use(express.static('public'))

// Activate HTTP server
const httpServer = app.listen(port, appListen)
async function appListen () {
  await shadows.init('./public/index.html', './public/shadows')
  console.log(`Listening for HTTP queries on: http://localhost:${port}`)
}

// Close connections when process is killed
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
function shutDown() {
  console.log('Received kill signal, shutting down gracefully');
  httpServer.close()
  ws.end()
  process.exit(0);
}

// WebSockets
ws.init(httpServer, port)

ws.onConnection = (socket, id) => {
  console.log("WebSocket client connected: " + id)

  // Saludem personalment al nou client
  socket.send(JSON.stringify({
    type: "private",
    from: "server",
    value: "Welcome to the chat server"
  }))

  // Li enviem el seu identificador
  socket.send(JSON.stringify({
    type: "id",
    from: "server",
    value: id
  }))

  // Enviem al client la llista amb tots els clients connectats
  socket.send(JSON.stringify({
    type: "list",
    from: "server",
    list: ws.getClients()
  }))

  // Enviem la direcció URI del nou client a tothom 
  ws.broadcast(JSON.stringify({
    type: "connected",
    from: "server",
    id: id
  }))
}

ws.onMessage = (socket, id, msg) => {
    let obj = JSON.parse(msg)
    console.log(`New message:  ${JSON.stringify(obj.type)}`)
    switch (obj.type) {
    case "list":
        socket.send(JSON.stringify({
        type: "list",
        from: "server",
        list: ws.getClients()
        }))
        break;
    case "private":
        let destSocket = ws.getClientById(obj.destination)
        if (destSocket) {
        destSocket.send(JSON.stringify({
            type: "private",
            from: id,
            value: obj.value
        }))
        }
        break;
    case "broadcast":

        ws.broadcast(JSON.stringify({
        type: "broadcast",
        from: id,
        value: obj.value
        }))
        break;
    }
}

ws.onClose = (socket, id) => {
  console.log("WebSocket client disconnected: " + id)

  // Informem a tothom que el client s'ha desconnectat
  ws.broadcast(JSON.stringify({
    type: "disconnected",
    from: "server",
    id: id
  }))
}

// Configurar la direcció '/index-dev.html' per retornar
// la pàgina que descarrega tots els shadows (desenvolupament)
app.get('/index-dev.html', getIndexDev)
async function getIndexDev (req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.send(shadows.getIndexDev())
}

// Configurar la direcció '/shadows.js' per retornar
// tot el codi de les shadows en un sol arxiu
app.get('/shadows.js', getShadows)
async function getShadows (req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(shadows.getShadows())
}