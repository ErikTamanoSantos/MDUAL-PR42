let socket;
let socketConnected = false;
let socketId = ""
let clients = []
let selectedClient = ""

function connect(protocol, ip, port) {

    socket = new WebSocket(`${protocol}://${ip}:${port}`)

    socket.onopen = function(e) {
        console.log("Socket connected")
        socketConnected = true
    }
    
    socket.onmessage = function(event) {
        let refViewPlaying = document.querySelector('game-ws').getViewShadow('game-view-playing')
        let obj = JSON.parse(event.data)
        refViewPlaying.onServerMessage(obj)
    }
}

function disconnect() {
    console.log("Socket disconnected")
    socket.close()
    socketConnected = false
}

function sendServer(obj) {
    let txt = JSON.stringify(obj) === "{}"
    if (msg == null || txt === "{}") return
    socket.send(txt)
}