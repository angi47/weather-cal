// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: calendar;
/*

~

Welcome to Weather Cal. Run this script to set up your widget.

Add or remove items from the widget in the layout section below.

You can duplicate this script to create multiple widgets. Make sure to change the name of the script each time.

Happy scripting!

~

*/

// Specify the layout of the widget items.
const layout = `
  
  row 
    column
      date
      sunset
      aktier
      space
      events
    
    column(90)
      current
      future
      space
       
`

/*
 * CODE
 * Be more careful editing this section. 
 * =====================================
 */

// Names of Weather Cal elements.
const codeFilename = "weather-cal-code"
const gitHubUrl = "https://raw.githubusercontent.com/angi47/weather-cal/refs/heads/main/weather-cal-code.js"

// Determine if the user is using iCloud.
let files = FileManager.local()
const iCloudInUse = files.isFileStoredIniCloud(module.filename)

// If so, use an iCloud file manager.
files = iCloudInUse ? FileManager.iCloud() : files

// Determine if the Weather Cal code exists and download if needed.
const pathToCode = files.joinPath(files.documentsDirectory(), codeFilename + ".js")
if (!files.fileExists(pathToCode)) {
  const req = new Request(gitHubUrl)
  const codeString = await req.loadString()
  files.writeString(pathToCode, codeString)
}

// Import the code.
if (iCloudInUse) { await files.downloadFileFromiCloud(pathToCode) }
const code = importModule(codeFilename)

//Mine ting (aktier)
const custom = {

  async aktier(column) {
    const nu = new Date()
    const time = nu.getHours()
    const dag = nu.getDay() // 1-5 er hverdag

    // Tjek om markedet er åbent (Man-Fre, 09:00 - 16:59)
    const erMarkedAaben = (dag >= 1 && dag <= 5) && (time >= 9 && time < 17)
    if (!erMarkedAaben) return 

    let stocks = ["AAPL", "MSFT", "GOOGL", "TSLA"]
    let upticker = SFSymbol.named("chevron.up")
    let downticker = SFSymbol.named("chevron.down")
    
    let mainStack = column.addStack()
    mainStack.layoutVertically()

    for (let symbol of stocks) {
      try {
        let url = "https://query2.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) + "?interval=1d&range=1d"
        let req = new Request(url)
        let res = await req.loadJSON()
        
        let meta = res.chart.result[0].meta
        let price = meta.regularMarketPrice
        let prevClose = meta.chartPreviousClose
        let change = price - prevClose
        
        let row = mainStack.addStack()
        row.centerAlignContent()
        
        let symTxt = row.addText(meta.symbol)
        symTxt.font = Font.boldMonospacedSystemFont(12)
        symTxt.textColor = Color.white()
        
        row.addSpacer()
        
        let priceTxt = row.addText(price.toFixed(2))
        priceTxt.font = Font.boldMonospacedSystemFont(12)
        
        row.addSpacer(4)
        
        let tickerImg
        if (change < 0) {
          priceTxt.textColor = Color.red()
          tickerImg = row.addImage(downticker.image)
          tickerImg.tintColor = Color.red()
        } else {
          priceTxt.textColor = Color.green()
          tickerImg = row.addImage(upticker.image)
          tickerImg.tintColor = Color.green()
        }
        tickerImg.imageSize = new Size(8, 8)
        
        mainStack.addSpacer(4)
      } catch(e) { console.error(e) }
    }
  },

  async events(column) {
    const eventData = await code.getEvents()
    
    if (eventData && eventData.length > 0) {
      await code.events(column)
    } else {
      // RETTET: Vi bruger 'custom.' i stedet for 'this.'
      const quoteData = await custom.getOnlineQuote()
      
      let stack = column.addStack()
      stack.layoutVertically()
      stack.setPadding(10, 0, 10, 0)
      
      let qText = stack.addText(`“${quoteData.content}”`)
      qText.font = Font.boldSystemFont(12)
      qText.textColor = Color.white()
      qText.leftAlignText()
      
      stack.addSpacer(4)
      
      if (quoteData.author) {
        let aText = stack.addText(`— ${quoteData.author}`)
        aText.font = Font.italicSystemFont(10)
        aText.textColor = Color.white()
        aText.textOpacity = 0.7;
        aText.rightAlignText()
      }
    }
  },

  async getOnlineQuote() {
    try {
      // Bemærk: api.quotable.io kan være nede i perioder. 
      // Her er en alternativ stabil kilde hvis den driller.
      const url = "https://api.quotable.io/random?maxLength=100"
      const req = new Request(url)
      const res = await req.loadJSON()
      return { content: res.content, author: res.author }
    } catch (e) {
      return { content: "Gør i dag fantastisk.", author: "Motivation" }
    }
  }
}

  // Funktion der henter citat fra nettet
  async getOnlineQuote() {
    try {
      // Vi bruger API'et fra quotable.io
      const url = "https://api.quotable.io/random?maxLength=100"; 
      const req = new Request(url);
      const res = await req.loadJSON();
      return {
        content: res.content,
        author: res.author
      };
    } catch (e) {
      // Fallback hvis internettet driller
      return {
        content: "Gør i dag fantastisk.",
        author: "Motivation"
      };
    }
  }
};
// Run the initial setup or settings menu.
let preview
if (config.runsInApp) {
  preview = await code.runSetup(Script.name(), iCloudInUse, codeFilename, gitHubUrl)
  if (!preview) return
}

// Set up the widget.
const widget = await code.createWidget(layout, Script.name(), iCloudInUse, custom)
Script.setWidget(widget)

// If we're in app, display the preview.
if (config.runsInApp) {
  if (preview == "small") { widget.presentSmall() }
  else if (preview == "medium") { widget.presentMedium() }
  else { widget.presentLarge() }
}

Script.complete()
