class GameViewPlaying extends HTMLElement {
    constructor() {
        super()
        this.canvas = null
        this.ctx = null
        this.cellOver = -1 // Conté l'índex de la cel·la sobre la que està el ratolí
        this.coords = { } // Conté les coordenades, mides del canvas
        this.board = ["", "", "", "", "", "", "", "", ""] // Tauler del joc (amb "X", "O" o "")
        this.opponent = ""
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
    } 

    async actionDisconnect () {
        disconnect()
        document.querySelector('game-ws').showView('game-view-disconnecting')
        await new Promise(resolve => setTimeout(resolve, 1500))
        document.querySelector('game-ws').showView('game-view-disconnected')
    }

    showInfo () {
        if (this.opponent == "") {
            this.shadow.querySelector('#connectionInfo').innerHTML = `Connected to <b>${socket.url}</b>, with ID <b>${socketId}</b>`
        } else {
            this.shadow.querySelector('#connectionInfo').innerHTML = `Connected to <b>${socket.url}</b>, with ID <b>${socketId}</b>. Playing against: <b>${this.opponent}</b>`
        }
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

        for (var cnt = 0; cnt < this.board.length; cnt++) {
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

        if (this.gameStatus == "move") {
            // Obtenir les coordenades del ratolí respecte al canvas
            var dpr = window.devicePixelRatio || 1
            var x = event.offsetX * dpr
            var y = event.offsetY * dpr
            
            // Utilitza la funció getCell per a obtenir l'índex de la cel·la
            this.cellOver = this.getCell(x, y)
            this.canvas.style.cursor = this.cellOver != -1 ? 'pointer' : 'default'
        }

        this.draw()
    }

    onServerMessage (obj) {
        console.log(obj)
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
            case "waintingMove":
            case "move":
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

    fillRect (ctx, lineWidth, color, x, y, width, height) {
        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = lineWidth
        ctx.fillStyle = color
        ctx.rect(x, y, width, height)
        ctx.fill()
        ctx.restore()
    }

    drawWaitingOpponent (ctx) {
        var fontFace = 'Arial'
        var fontSize = 30
        var color = 'black'
        var alignment = 'center'
        var text = 'Waiting for opponent...'
        var x = this.coords.centerX
        var y = this.coords.centerY
        this.drawText(ctx, fontFace, fontSize, color, alignment, text, x, y)
    }

    drawBoard (ctx) {
        var color = "black"
        var cellSize = this.coords.cellSize

        for (var cnt = 0; cnt < this.board.length; cnt++) {
            var cell = this.board[cnt]
            var cellCoords = this.coords.cells[cnt]

            // Si toca jugar, i el ratolí està sobre la cel·la, dibuixa el fons
            if (this.cellOver == cnt) {
                this.fillRect(ctx, 10, "lightblue", cellCoords.x, cellCoords.y, cellSize, cellSize)
            }

            // Dibuixa el requadre de la cel·la
            this.drawRect(ctx, 10, color, cellCoords.x, cellCoords.y, cellSize, cellSize)

            // Dibuixa el contingut de la cel·la
            if (cell == "X") {
                var padding = 20
                var x0 = cellCoords.x + padding
                var y0 = cellCoords.y + padding
                var x1 = cellCoords.x + cellSize - padding
                var y1 = cellCoords.y + cellSize - padding
                this.drawLine(ctx, 10, "red", x0, y0, x1, y1)
                x0 = cellCoords.x + cellSize - padding
                x1 = cellCoords.x + padding
                this.drawLine(ctx, 10, "red", x0, y0, x1, y1)
            }
            if (cell == "O") {
                var padding = 20
                var x = cellCoords.x + (cellSize / 2)
                var y = cellCoords.y + (cellSize / 2)
                this.drawCircle(ctx, 10, "green", x, y, (cellSize / 2) - padding)
            }
        }
    }
}

// Defineix l'element personalitzat
customElements.define('game-view-playing', GameViewPlaying)