let socket;
let socketConnected = false;
let socketId = ""
let clients = []
let selectedClient = ""
let opponent = ""

function connect(protocol, ip, port) {

    socket = new WebSocket(`${protocol}://${ip}:${port}`)

    socket.onopen = function(e) {
        console.log("Socket connected")
        socketConnected = true
    }
    
    socket.onmessage = function(event) {
        let refViewConnected = document.querySelector('game-ws').getViewShadow('game-view-playing')
        let data = JSON.parse(event.data)
        let message = ""
        console.log(data)
        switch (data.type) {
            case 'list':
                clients = data.list.map(e => e.toString())
                if (clients.indexOf(socketId) != -1) {
                    clients.splice(clients.indexOf(socketId), 1)
                }
                // refViewConnected.setClients()
                message = `List of clients: ${data.list}\n`
                break;
            case 'id':
                socketId = data.value;
                message = `Id received: ${data.value}\n`
                break;
            case 'connected':
                clients.push(data.id)
                if (clients.indexOf(socketId) != -1) {
                    clients.splice(clients.indexOf(socketId), 1)
                }
                // refViewConnected.setClients()
                message = `Connected client: ${data.id}\n`
                break
            case 'disconnected':
                if (selectedClient === data.id) {
                    selectedClient = "";
                }
                clients.splice(clients.indexOf(data.id), 1)
                // refViewConnected.setClients();
                message = `Disconnected client: ${data.id}\n`
                break
            case 'private':
                message = `Private message from '${data.from}': ${data.value}\n`
                break
            default:
                message = `Message from '${data.from}': ${data.value}\n`
                break
        }

        if (message != "") {
            // refViewConnected.addMessage(message)
        }
    }
}

function disconnect() {
    console.log("Socket disconnected")
    socket.close();
    socketConnected = false;
}

// Funcions per a enviar missatges, desconnectar, etc.
function sendMessage(message) {
    socket.send(JSON.stringify(message))
}

function broadcastMessage(msg) {
    let message = {
      'type': 'broadcast',
      'value': msg,
    }
    if (msg == "") return
    socket.send(JSON.stringify(message))
}

function privateMessage(msg) {
    let message = {
        'type': 'private',
        'value': msg,
        'destination': selectedClient,
    }
    if (msg == "") return
    if (selectedClient == "") return
    socket.send(JSON.stringify(message))
}