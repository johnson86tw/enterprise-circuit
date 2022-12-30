import { defineStore } from 'pinia'

export const useUI = defineStore('ui', {
  state: () => ({
    //overall scaling
    isAutoPresent: false,
    showText: true,
    scale: 1,
    maxScale: 4,
    minScale: 0.5,
    //cached values for window size and mouse position
    window: {
      width: 1200,
      height: 1200,
      mouseX: 600,
      mouseY: 600,
      mouseDirection: 0
    },
    //current resolution of the window into the SVG
    viewport: {
      width: 20,
      height: 20
    },
    //used to preserve 16:9 or 9:16 window when scaling
    protectedBox: {
      long: 1200,
      short: 675
    }
  }),
  actions: {
    resizeHandler() {
      //the window size changed, so record the new size
      this.window.width = window.innerWidth
      this.window.height = window.innerHeight

      //determine portrait vs landscape
      const shortSide = Math.min(this.window.width, this.window.height)
      const longSide = Math.max(this.window.width, this.window.height)

      //determine scaler that best preserves the target box
      const shortSideRatio = (shortSide / this.protectedBox.short)
      const longSideRatio = (longSide / this.protectedBox.long)

      //get the scaler for the most constrained direction
      let scaler = 1
      if (shortSideRatio > longSideRatio) {
        scaler = 1 / longSideRatio
      } else {
        scaler = 1 / shortSideRatio
      }

      //apply new resolution to SVG's viewport based on scaler
      this.viewport.width = Math.round(this.window.width * scaler)
      this.viewport.height = Math.round(this.window.height * scaler)
    },
    mouseMoveHandler(event:any) {
      //we record the explicit mouse coords and calc SVG coords in getter
      const xdif = this.window.mouseX - event.pageX
      const ydif = this.window.mouseY - event.pageY
      this.window.mouseDirection = Math.atan2(ydif, xdif) / Math.PI * 180
      this.window.mouseX = event.pageX
      this.window.mouseY = event.pageY
    },
    setScale(newScale:number) {
      this.scale = Math.max(
        this.minScale,
        Math.min(
          this.maxScale,
          newScale
        )
      )
      this.resizeHandler()
    },
  },
  getters: {
    viewBoxSize():string {
      return (
        this.left +
        ' ' +
        this.top +
        ' ' +
        this.width +
        ' ' +
        this.height
      )
    },

    //view modes
    portrait():boolean {
      return (this.height > this.width)
    },
    landscape():boolean {
      return (!this.portrait)
    },

    //viewbox height and width
    width():number {
      return Math.round(this.scale * this.viewport.width)
    },
    height():number {
      return Math.round(this.scale * this.viewport.height)
    },

    //viewable edges of SVG at current resolution
    top():number {
      return this.height / -2
    },
    bottom():number {
      return this.height / 2
    },
    left():number {
      return this.width / -2
    },
    right():number {
      return this.width / 2
    },

    //target box coords for rendering debug
    protectedBoxX(): number {
      if (this.portrait) {
        return this.protectedBox.short / -2
      }
      return this.protectedBox.long / -2
    },
    protectedBoxY(): number {
      if (this.portrait) {
        return this.protectedBox.long / -2
      }
      return this.protectedBox.short / -2
    },
    protectedBoxWidth(): number {
      if (this.portrait) {
        return this.protectedBox.short
      }
      return this.protectedBox.long
    },
    protectedBoxHeight(): number {
      if (this.portrait) {
        return this.protectedBox.long
      }
      return this.protectedBox.short
    },

    //mouse coords in SVG context
    mouseX():number {
      return this.width * (this.window.mouseX / this.window.width) - (this.width / 2)
    },
    mouseY():number {
      return this.height * (this.window.mouseY / this.window.height) - (this.height / 2)
    },

  }
})
