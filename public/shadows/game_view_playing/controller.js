class GameViewPlaying extends HTMLElement {
    constructor() {
        super()
        this.canvas = null
        this.ctx = null
        this.cellOver = -1  // Conté l'índex de la cel·la sobre la que està el ratolí
        this.cellOpponentOver = -1 // Conté l'índex de la cel·la sobre la que està l'oponent
        this.coords = { }   // Conté les coordenades, mides del canvas
        this.socketId = -1  // Conté l'identificador del socket
        this.match = {      // Conté la informació de la partida
            idMatch: -1,
            playerX: "",
            playerO: "",
            board: [],
            nextTurn: "X"
        }
        this.opponent = ""  // Conté el nom de l'oponent
        this.gameStatus = "waitingOpponent" 
        this.shadow = this.attachShadow({ mode: 'open' })
    }

    async connectedCallback() {
        // Carrega els estils CSS
        const style = document.createElement('style')
        style.textContent = await fetch('/shadows/game_view_playing/style.css').then(r => r.text())
        this.shadow.appendChild(style)
    
        // Carrega els elements HTML
        const htmlContent = await fetch('/shadows/game_view_playing/view.html').then(r => r.text())

        // Converteix la cadena HTML en nodes utilitzant un DocumentFragment
        const template = document.createElement('template');
        template.innerHTML = htmlContent;
        
        // Clona i afegeix el contingut del template al shadow
        this.shadow.appendChild(template.content.cloneNode(true));

        // Definir els 'eventListeners' dels objectes 
        this.shadow.querySelector('#buttonDisconnect').addEventListener('click', this.actionDisconnect.bind(this))

        // Inicial el canvas
        this.initCanvas()

        // Vincular l'event de canvi de mida de la finestra a la mida del canvas
        window.addEventListener('resize', this.onResizeCanvas.bind(this))
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this))
        this.canvas.addEventListener('click', this.onMouseClick.bind(this))
    } 

    async actionDisconnect () {
        disconnect()
    }

    async showDisconnecting () {
        document.querySelector('game-ws').showView('game-view-disconnecting')
        await new Promise(resolve => setTimeout(resolve, 1500))
        document.querySelector('game-ws').showView('game-view-disconnected')
    }

    showInfo () {
        let txt = `Connected to <b>${socket.url}</b>, with ID <b>${this.socketId}</b>.`
        if (this.opponent != "") {
            txt = txt + ` Playing against: <b>${this.opponent}</b>`
        }
        this.shadow.querySelector('#connectionInfo').innerHTML = txt
    }

    initCanvas () {
        
        // Obtenir una referència al canvas i al context
        this.canvas = this.shadow.querySelector('canvas')
        this.ctx = this.canvas.getContext('2d')

        // Definir la mida del canvas segons la resolución del dispositiu
        this.onResizeCanvas()   
    }

    onResizeCanvas () {
        // Definir la resolució en píxels del canvas 
        // tenint en compte la densitat de píxels del dispositiu

        if (!this.canvas) return // Pot ser que es cridi 'resizeCanvas' abans de crear el canvas

        var dpr = window.devicePixelRatio || 1
        this.canvas.width = this.canvas.offsetWidth * dpr
        this.canvas.height = this.canvas.offsetHeight * dpr
        var height = this.canvas.height
        var width = this.canvas.width

        // Calculate useful coords and sizes
        var thirdHorizontal = width / 3
        var thirdVertical = height / 3
        var cellSize = Math.min(thirdHorizontal, thirdVertical) - 5
        var sixth = cellSize / 2
        var centerX = width / 2
        var centerY = height / 2

        // Set coords
        this.coords.cellSize = cellSize
        this.coords.centerX = centerX
        this.coords.centerY = centerY
        this.coords.height = height
        this.coords.width = width
        this.coords.x = centerX - sixth - cellSize
        this.coords.y = centerY - sixth - cellSize
        this.coords.cells = []

        for (var cnt = 0; cnt < 9; cnt++) {
            var cellRow = cnt % 3
            var cellCol = Math.floor(cnt / 3)
            var cellX = this.coords.x + (cellRow * cellSize)
            var cellY = this.coords.y + (cellCol * cellSize)

            this.coords.cells.push({ x: cellX, y: cellY })
        }

        // Redibuixar el canvas
        this.draw()
    }

    onMouseMove (event) {

        if (this.isMyTurn() && this.gameStatus == "gameRound") {

            // Obtenir les coordenades del ratolí respecte al canvas
            var dpr = window.devicePixelRatio || 1
            var x = event.offsetX * dpr
            var y = event.offsetY * dpr
            
            // Utilitza la funció getCell per a obtenir l'índex de la cel·la
            this.cellOver = this.getCell(x, y)

            if (this.match.board[this.cellOver] == "") {
                // Si és una casella jugable, canvia el cursor del ratolí
                this.canvas.style.cursor = 'pointer'
            } else {
                // Si no és jugable, restaura el cellOver i el cursor
                this.cellOver = -1
                this.canvas.style.cursor = 'default'
            }    

            // Envia al rival la cel·la del ratolí
            sendServer({
                type: "cellOver",
                value: this.cellOver
            })
        }

        this.draw()
    }

    onMouseClick (event) {

        if (this.isMyTurn() && this.gameStatus == "gameRound") {

            // Obtenir les coordenades del ratolí respecte al canvas
            var dpr = window.devicePixelRatio || 1
            var x = event.offsetX * dpr
            var y = event.offsetY * dpr
            
            // Utilitza la funció getCell per a obtenir l'índex de la cel·la
            this.cellOver = this.getCell(x, y)

            if (this.match.board[this.cellOver] != "") {
                this.cellOver = -1
            }    

            if (this.cellOver != -1) {
                // Envia la jugada
                sendServer({
                    type: "cellChoice",
                    value: this.cellOver
                })
            }
        }
    }

    onServerMessage (obj) {
        switch (obj.type) {
        case "socketId":
            this.socketId = obj.value
            break
        case "initMatch":
            this.match = obj.value
            if (this.match.playerX == this.socketId) {
                this.opponent = this.match.playerO
            } else {
                this.opponent = this.match.playerX
            }
            this.showInfo()
            break
        case "opponentDisconnected":
            console.log("opponentDisconnected")
            this.opponent = ""
            this.gameStatus = "waitingOpponent"
            break
        case "opponentOver":
            this.cellOpponentOver = obj.value
            break
        case "gameRound":
            this.gameStatus = "gameRound"
            this.cellOpponentOver = -1
            this.match = obj.value
            break
        }
        this.draw()
    }

    isMyTurn () {
        var nextTurn = this.match.nextTurn
        var myTurn = false

        if (nextTurn == "X" && this.socketId == this.match.playerX) {
            myTurn = true
        } else if (nextTurn == "O" && this.socketId == this.match.playerO) {
            myTurn = true
        }   
        
        return myTurn
    }
    
    getCell(x, y) {
        var cells = this.coords.cells
        var cellSize = this.coords.cellSize
    
        for (var cnt = 0; cnt < cells.length; cnt++) {
            var cell = cells[cnt]
            
            // Calcula les coordenades mínimes i màximes del requadre de la cel·la
            var x0 = cell.x
            var y0 = cell.y
            var x1 = cell.x + cellSize
            var y1 = cell.y + cellSize
            
            // Comprova si (x, y) està dins del requadre de la cel·la
            if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
                return cnt
            }
        }
    
        return -1  // Retorna -1 si (x, y) no està dins de cap cel·la
    }

    draw () {
        var ctx = this.ctx

        // Dibuixar el fons en blanc
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, this.coords.width, this.coords.height)

        // "waitingOpponent", "waintingMove", "move", "gameOver" 
        switch (this.gameStatus) {
            case "waitingOpponent":
                this.drawWaitingOpponent(ctx)
                break
            case "gameRound":
                this.drawBoard(ctx)
                break
            case "gameOver":
                this.drawBoard(ctx)
                this.drawGameOver(ctx)
                break
        }
    }

    drawLine (ctx, lineWidth, color, x0, y0, x1, y1) {
        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = color
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()
        ctx.restore()
    }

    drawCircle (ctx, lineWidth, color, x, y, radius) {
        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = color
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.restore()
    }

    drawRect (ctx, lineWidth, color, x, y, width, height) {
        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = color
        ctx.rect(x, y, width, height)
        ctx.stroke()
        ctx.restore()
    }

    fillRect (ctx, lineWidth, color, x, y, width, height) {
        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = lineWidth
        ctx.fillStyle = color
        ctx.rect(x, y, width, height)
        ctx.fill()
        ctx.restore()
    }

    drawText(ctx, fontFace, fontSize, color, alignment, text, x, y) {
        ctx.save();
        ctx.font = fontSize + 'px ' + fontFace;
        var metrics = ctx.measureText(text);
        var textWidth = metrics.width;

        switch (alignment) {
            case 'center':
                x -= textWidth / 2;
                break;
            case 'right':
                x -= textWidth;
                break;
            case 'left':
            default:
                // No adjustment needed for left alignment
                break;
        }

        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    drawWaitingOpponent (ctx) {
        var fontFace = 'Arial'
        var fontSize = 30
        var color = 'black'
        var alignment = 'center'
        var text = 'Esperant un oponent...'
        var x = this.coords.centerX
        var y = this.coords.centerY
        this.drawText(ctx, fontFace, fontSize, color, alignment, text, x, y)
    }

    drawBoard (ctx) {
        var color = "black"
        var cellSize = this.coords.cellSize
        var board = this.match.board

        for (var cnt = 0; cnt < board.length; cnt++) {
            var cell = board[cnt]
            var cellCoords = this.coords.cells[cnt]

            // Si toca jugar, i el ratolí està sobre la cel·la, dibuixa el fons
            if (this.cellOver == cnt && board[cnt] == "") {
                var cellOverCords = this.coords.cells[this.cellOver]
                this.fillRect(ctx, 10, "lightblue", cellCoords.x, cellCoords.y, cellSize, cellSize)
                if (this.socketId == this.match.playerX) {
                   this.drawX(ctx, "red", cellOverCords, cellSize)
                } else if (this.socketId == this.match.playerO) {
                    this.drawO(ctx, "green", cellOverCords, cellSize)
                } 
            }

            // Si no toca jugar, però sabem la posició del ratolí de l'oponent
            if (this.cellOpponentOver == cnt) {
                var cellOverCords = this.coords.cells[this.cellOpponentOver]
                this.fillRect(ctx, 10, "#ccc", cellCoords.x, cellCoords.y, cellSize, cellSize)
                if (this.socketId == this.match.playerX) {
                   this.drawO(ctx, "#888", cellOverCords, cellSize)
                } else if (this.socketId == this.match.playerO) {
                    this.drawX(ctx, "#888", cellOverCords, cellSize)
                } 
            }

            // Dibuixa el requadre de la cel·la
            this.drawRect(ctx, 10, color, cellCoords.x, cellCoords.y, cellSize, cellSize)

            // Dibuixa el contingut de la cel·la
            if (cell == "X") {
                this.drawX(ctx, "red", cellCoords, cellSize)
            }
            if (cell == "O") {
                this.drawO(ctx, "green", cellCoords, cellSize)
            }
        }
    }

    drawX (ctx, color, cellCoords, cellSize) {
        var padding = 20
        var x0 = cellCoords.x + padding
        var y0 = cellCoords.y + padding
        var x1 = cellCoords.x + cellSize - padding
        var y1 = cellCoords.y + cellSize - padding
        this.drawLine(ctx, 10, color, x0, y0, x1, y1)
        x0 = cellCoords.x + cellSize - padding
        x1 = cellCoords.x + padding
        this.drawLine(ctx, 10, color, x0, y0, x1, y1)
    }

    drawO (ctx, color, cellCoords, cellSize) {
        var padding = 20
        var x = cellCoords.x + (cellSize / 2)
        var y = cellCoords.y + (cellSize / 2)
        this.drawCircle(ctx, 10, color, x, y, (cellSize / 2) - padding)
    }
}

// Defineix l'element personalitzat
customElements.define('game-view-playing', GameViewPlaying)