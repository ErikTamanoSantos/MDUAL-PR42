class GameViewPlaying extends HTMLElement {
    constructor() {
        super()
        this.canvas = null
        this.ctx = null
        this.coords = {} // Conté les coordenades, mides del canvas i posició del mouseOver
        this.shadow = this.attachShadow({ mode: 'open' })
        this.board = ["X", "O", "X", "O", "X", "O", "X", "O", "X"]
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
        window.addEventListener('mousemove', this.onMouseMove.bind(this))
    } 

    async actionDisconnect () {
        disconnect()
        document.querySelector('game-ws').showView('game-view-disconnecting')
        await new Promise(resolve => setTimeout(resolve, 1500))
        document.querySelector('game-ws').showView('game-view-disconnected')
    }

    showInfo () {
        if (opponent == "") {
            this.shadow.querySelector('#connectionInfo').innerHTML = `Connected to <b>${socket.url}</b>, with ID <b>${socketId}</b>`
        } else {
            this.shadow.querySelector('#connectionInfo').innerHTML = `Connected to <b>${socket.url}</b>, with ID <b>${socketId}</b>. Playing against: <b>${socketId}</b>`
        }
    }

    initCanvas () {
        
        // Obtenir una referència al canvas i al context
        this.canvas = this.shadow.querySelector('canvas')
        this.ctx = this.canvas.getContext('2d')

        // Definir la mida del canvas segons la resolución del dispositiu
        this.coords.cellOver = -1  
        this.onResizeCanvas()   
    }

    onResizeCanvas () {
        // Definir la resolució en píxels del canvas 
        // tenint en compte la densitat de píxels del dispositiu

        if (!this.canvas) return // Pot ser que es cridi 'resizeCanvas' abans de crear el canvas

        var dpr = window.devicePixelRatio || 1
        this.canvas.width = this.canvas.offsetWidth * dpr
        this.canvas.height = this.canvas.offsetHeight * dpr

        // Calculate useful coords and sizes
        var height = this.canvas.height
        var width = this.canvas.width
        var halfHorizontal = width / 2
        var halfVertical = height / 2
        var thirdHorizontal = width / 3
        var thirdVertical = height / 3
        var third = Math.min(thirdHorizontal, thirdVertical)
        var sixth = third / 2
        
        var x0 = halfHorizontal - third
        var x1 = halfHorizontal
        var x2 = halfHorizontal + third
        var y0 = halfVertical - third
        var y1 = halfVertical
        var y2 = halfVertical + third

        this.coords.height = height
        this.coords.width = width
        this.coords.cellSize = sixth - 16
        this.coords.boardCells = [
            { x: x0, y: y0 },
            { x: x1, y: y0 },
            { x: x2, y: y0 },
            { x: x0, y: y1 },
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x0, y: y2 },
            { x: x1, y: y2 },
            { x: x2, y: y2 }
        ]
        this.coords.boardLines = [
            { // First vertical line
                x0: halfHorizontal - sixth,
                y0: halfVertical - third - sixth,
                x1: halfHorizontal - sixth,
                y1: halfVertical + third + sixth
            }, 
            { // Second vertical line
                x0: halfHorizontal + sixth,
                y0: halfVertical - third - sixth,
                x1: halfHorizontal + sixth,
                y1: halfVertical + third + sixth
            },
            { // First horizontal line
                x0: halfHorizontal - third - sixth,
                y0: halfVertical - sixth,
                x1: halfHorizontal + third + sixth,
                y1: halfVertical - sixth
            },    
            { // Second horizontal line
                x0: halfHorizontal - third - sixth,
                y0: halfVertical + sixth,
                x1: halfHorizontal + third + sixth,
                y1: halfVertical + sixth
            }
        ]

        // Redibuixar el canvas
        this.draw()
    }

    onMouseMove (event) {
        var cell = -1 // TODO
        if (cell != -1) {
            this.coords.cellOver = cell
            this.draw()
        }
    }

    getCell(x, y) {
        // TODO
    }

    draw () {
        var ctx = this.ctx

        // Dibuixar el fons en blanc
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, this.coords.width, this.coords.height)

        // Dibuixar el 'mouseOver' d'una cel·la
        this.drawMouseOver(ctx)

        // Dibuixar les linies del tauler
        this.drawBoardLines(ctx)

        // Dibuixar les fitxes
        this.drawBoardCells(ctx)
    }

    drawLine (ctx, width, color, x0, y0, x1, y1) {
        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = width
        ctx.strokeStyle = color
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()
        ctx.restore()
    }

    drawCircle (ctx, width, color, x, y, radius) {
        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = width
        ctx.strokeStyle = color
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.restore()
    }

    drawMouseOver (ctx) {
        var cellOver = this.coords.cellOver
        var boardCells = this.coords.boardCells
        var cellSize = this.coords.cellSize

        if (cellOver != -1) {
            var cell = boardCells[cellOver]
            var x0 = cell.x - cellSize
            var y0 = cell.y - cellSize
            var x1 = cell.x + cellSize
            var y1 = cell.y + cellSize
            this.drawLine(ctx, 10, "blue", x0, y0, x1, y1)
            x0 = cell.x + cellSize
            x1 = cell.x - cellSize
            this.drawLine(ctx, 10, "blue", x0, y0, x1, y1)
        }
    }

    drawBoardLines (ctx) {
        var color = "black"
        var boardLines = this.coords.boardLines

        for (var cnt = 0; cnt < boardLines.length; cnt++) {
            var line = boardLines[cnt]
            this.drawLine(ctx, 10, color, line.x0, line.y0, line.x1, line.y1)
        }
    }

    drawBoardCells (ctx) {
        var boardCells = this.coords.boardCells
        var cellSize = this.coords.cellSize

        for (var cnt = 0; cnt < this.board.length; cnt++) {
            var value = this.board[cnt]
            var cell = boardCells[cnt]
            if (value == "X") {
                var x0 = cell.x - cellSize
                var y0 = cell.y - cellSize
                var x1 = cell.x + cellSize
                var y1 = cell.y + cellSize
                this.drawLine(ctx, 10, "red", x0, y0, x1, y1)
                x0 = cell.x + cellSize
                x1 = cell.x - cellSize
                this.drawLine(ctx, 10, "red", x0, y0, x1, y1)
            } else if (value == "O") {
                this.drawCircle(ctx, 10, "green", cell.x, cell.y, this.coords.cellSize)
            }
        }
    }
}

// Defineix l'element personalitzat
customElements.define('game-view-playing', GameViewPlaying)