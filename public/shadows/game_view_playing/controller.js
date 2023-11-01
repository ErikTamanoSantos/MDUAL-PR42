class GameViewPlaying extends HTMLElement {
    constructor() {
        super()
        this.canvas = null
        this.ctx = null
        this.coords = {}
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
        window.addEventListener('resize', this.resizeCanvas.bind(this))
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
        this.resizeCanvas()        
    }

    resizeCanvas () {
        // Definir la resolució en píxels del canvas 
        // tenint en compte la densitat de píxels del dispositiu

        if (!this.canvas) return // Pot ser que es cridi 'resizeCanvas' abans de crear el canvas

        var dpr = window.devicePixelRatio || 1
        this.canvas.width = this.canvas.offsetWidth * dpr
        this.canvas.height = this.canvas.offsetHeight * dpr

        // Calculate useful coords and sizes
        var height = this.canvas.height
        var width = this.canvas.width
        var thirdHorizontal = width / 3
        var thirdVertical = height / 3
        var third = Math.min(thirdHorizontal, thirdVertical)
        var sixth = third / 2
        var halfHorizontal = width / 2
        var halfVertical = height / 2

        this.coords = {
            height: height,
            width: width,
            board: {
                vertical0 : {
                    x0: halfHorizontal - sixth,
                    y0: halfVertical - third - sixth,
                    x1: halfHorizontal - sixth,
                    y1: halfVertical + third + sixth
                },
                vertical1 : {
                    x0: halfHorizontal + sixth,
                    y0: halfVertical - third - sixth,
                    x1: halfHorizontal + sixth,
                    y1: halfVertical + third + sixth
                },
                horizontal0 : {
                    x0: halfHorizontal - third - sixth,
                    y0: halfVertical - sixth,
                    x1: halfHorizontal + third + sixth,
                    y1: halfVertical - sixth
                },
                horizontal1 : {
                    x0: halfHorizontal - third - sixth,
                    y0: halfVertical + sixth,
                    x1: halfHorizontal + third + sixth,
                    y1: halfVertical + sixth
                }
            }
        }

        // Redibuixar el canvas
        this.draw()
    }

    draw () {
        var ctx = this.ctx

        // Dibuixar el fons en blanc
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, this.coords.width, this.coords.height)

        // Dibuixar les linies del tauler
        this.drawBoardLines(ctx)

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

    drawBoardLines (ctx) {
        var color = "black"

        // Draw vertical lines
        var x0 = this.coords.board.vertical0.x0
        var y0 = this.coords.board.vertical0.y0
        var x1 = this.coords.board.vertical0.x1
        var y1 = this.coords.board.vertical0.y1
        this.drawLine(ctx, 10, color, x0, y0, x1, y1)

        var x0 = this.coords.board.vertical1.x0
        var y0 = this.coords.board.vertical1.y0
        var x1 = this.coords.board.vertical1.x1
        var y1 = this.coords.board.vertical1.y1
        this.drawLine(ctx, 10, color, x0, y0, x1, y1)

        // Draw horizontal lines
        var x0 = this.coords.board.horizontal0.x0
        var y0 = this.coords.board.horizontal0.y0
        var x1 = this.coords.board.horizontal0.x1
        var y1 = this.coords.board.horizontal0.y1
        this.drawLine(ctx, 10, color, x0, y0, x1, y1)

        var x0 = this.coords.board.horizontal1.x0
        var y0 = this.coords.board.horizontal1.y0
        var x1 = this.coords.board.horizontal1.x1
        var y1 = this.coords.board.horizontal1.y1
        this.drawLine(ctx, 10, color, x0, y0, x1, y1)
    }
}

// Defineix l'element personalitzat
customElements.define('game-view-playing', GameViewPlaying)