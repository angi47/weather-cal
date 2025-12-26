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

    let stocks = ["ALTO", "BIOPOR.CO", "NOVO-B.CO", "SAAB-B.ST", "PSNY"]
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
        let percentChange = (change / prevClose) * 100
        
        let row = mainStack.addStack()
        row.centerAlignContent()
        
        let symTxt = row.addText(meta.symbol)
        symTxt.font = Font.boldMonospacedSystemFont(12)
        symTxt.textColor = Color.white()
        
        row.addSpacer()
        
        let priceTxt = row.addText(price.toFixed(2))
        priceTxt.font = Font.boldMonospacedSystemFont(12)
        
        row.addSpacer(4)
        
        // Vis procent ændring
        let percentTxt = row.addText(percentChange.toFixed(2) + "%")
        percentTxt.font = Font.boldMonospacedSystemFont(11)
        
        row.addSpacer(4)
        
        let tickerImg
        if (change < 0) {
          priceTxt.textColor = Color.red()
          percentTxt.textColor = Color.red()
          tickerImg = row.addImage(downticker.image)
          tickerImg.tintColor = Color.red()
        } else {
          priceTxt.textColor = Color.green()
          percentTxt.textColor = Color.green()
          tickerImg = row.addImage(upticker.image)
          tickerImg.tintColor = Color.green()
        }
        tickerImg.imageSize = new Size(8, 8)
        
        mainStack.addSpacer(4)
      } catch(e) { console.error(e) }
    }
  },

  async events(column) {
  // Hent code objektet som har adgang til data
  const code = importModule(codeFilename)
  
  // Brug den eksisterende setupEvents funktion der respekterer alle indstillinger
  if (!code.data || !code.data.events) { 
    await code.setupEvents() 
  }
  
  // Hvis der ER events, vis dem ikke (vi vil have citatet i stedet)
  if (code.data.events && code.data.events.length > 0) {
    // Der er events - returner tidligt så citatet ikke vises
    return
  }
  
  // Ingen events - vis citat i stedet
  console.log("Ingen events - viser citat")
  const quoteData = await custom.getOnlineQuote()
  
  let stack = column.addStack()
  stack.layoutVertically()
  stack.setPadding(10, 0, 10, 0)
  
  let qText = stack.addText(`"${quoteData.content}"`)
  qText.font = Font.boldSystemFont(12)
  qText.textColor = Color.white()
  qText.leftAlignText()
  
  stack.addSpacer(4)
  
  if (quoteData.author) {
    let aText = stack.addText(`— ${quoteData.author}`)
    aText.font = Font.italicSystemFont(10)
    aText.textColor = Color.white()
    aText.textOpacity = 0.7
    aText.rightAlignText()
  }
},

  async getOnlineQuote() {
    const cacheKey = "weather-cal-quote-cache"
    const cacheMaxAge = 6 * 60 * 60 * 1000 // 6 timer i millisekunder
    
    // Liste over API-endpoints at prøve (i rækkefølge)
    const apiEndpoints = [
      {
        url: "https://api.quotable.io/random?maxLength=100",
        parser: (data) => ({ content: data.content, author: data.author }),
        name: "Quotable.io"
      },
      {
        url: "https://stoicism-quotes-api.vercel.app/api/v1/quotes/random",
        parser: (data) => ({ content: data.quote, author: data.author }),
        name: "Stoicism API"
      },
      {
        url: "https://quotes.toscrape.com/random",
        parser: (html) => {
          // Simple HTML parsing for fallback
          const quoteMatch = html.match(/<span class="text" itemprop="text">([^<]+)<\/span>/)
          const authorMatch = html.match(/<small class="author" itemprop="author">([^<]+)<\/small>/)
          return { 
            content: quoteMatch ? quoteMatch[1].trim() : "Visdom findes i naturen.", 
            author: authorMatch ? authorMatch[1].trim() : "Ukendt" 
          }
        },
        name: "Quotes to Scrape"
      }
    ]
    
    // Fallback quotes hvis alle API'er fejler
    const fallbackQuotes = [
      { content: "Gør i dag fantastisk.", author: "Motivation" },
      { content: "Hver dag er en ny mulighed.", author: "Visdom" },
      { content: "Vær stilheden i stormen.", author: "Stoicism" },
      { content: "Fremtiden starter i dag.", author: "Inspirator" },
      { content: "Naturen er den bedste lærer.", author: "Filosofi" }
    ]
    
    // Håndtering af cache
    const cacheFile = files.joinPath(files.documentsDirectory(), cacheKey + ".json")
    let cachedQuote = null
    
    // Check for eksisterende cache
    if (files.fileExists(cacheFile)) {
      try {
        const cacheData = JSON.parse(files.readString(cacheFile))
        const cacheAge = Date.now() - cacheData.timestamp
        if (cacheAge < cacheMaxAge) {
          cachedQuote = cacheData.quote
        }
      } catch (e) {
        console.error("Cache læsefejl:", e)
      }
    }
    
    // Returner cached quote hvis den er gyldig
    if (cachedQuote && !this.forceRefresh) {
      return cachedQuote
    }
    
    // Forsøg at hente fra API'er
    for (const endpoint of apiEndpoints) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Forsøger ${endpoint.name} (forsøg ${attempt}/3)`)
          const req = new Request(endpoint.url)
          const response = endpoint.url.includes('toscrape') 
            ? await req.loadString() 
            : await req.loadJSON()
          
          const quote = endpoint.parser(response)
          
          // Gem i cache
          const cacheData = {
            quote: quote,
            timestamp: Date.now()
          }
          files.writeString(cacheFile, JSON.stringify(cacheData))
          
          console.log(`Succes: Fik quote fra ${endpoint.name}`)
          return quote
          
        } catch (e) {
          console.error(`Fejl ved ${endpoint.name} (forsøg ${attempt}):`, e)
        }
      }
    }
    
    // Alle API'er fejlede - brug fallback
    const randomFallback = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]
    console.log("Alle API'er fejlede - bruger fallback quote")
    return randomFallback
  },

  // Metode til at tvinge frisk download af quotes
  forceRefreshQuotes() {
    this.forceRefresh = true
    const cacheFile = files.joinPath(files.documentsDirectory(), "weather-cal-quote-cache.json")
    if (files.fileExists(cacheFile)) {
      files.remove(cacheFile)
    }
    console.log("Cache slettet - tvinger frisk quote")
  }
}

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
