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
      aktierOrWeather
      space
      eventOrQuote
    
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

// Determine if the user is using iCloud - with error handling
let files = FileManager.local()
let iCloudInUse = false

try {
  iCloudInUse = files.isFileStoredIniCloud(module.filename)
  if (iCloudInUse) {
    files = FileManager.iCloud()
  }
} catch (e) {
  console.log("iCloud not available, using local storage: " + e)
  iCloudInUse = false
  files = FileManager.local()
}

// Determine if the Weather Cal code exists and download if needed.
const pathToCode = files.joinPath(files.documentsDirectory(), codeFilename + ".js")
if (!files.fileExists(pathToCode)) {
  const req = new Request(gitHubUrl)
  const codeString = await req.loadString()
  files.writeString(pathToCode, codeString)
}

// Import the code.
if (iCloudInUse) { 
  try {
    await files.downloadFileFromiCloud(pathToCode)
  } catch (e) {
    console.log("Could not download from iCloud: " + e)
  }
}
const code = importModule(codeFilename)

//Mine ting (aktier)
const custom = {

  async aktierOrWeather(column) {
    const nu = new Date()
    const time = nu.getHours()
    const dag = nu.getDay() // 1-5 er hverdag

    // Tjek om markedet er åbent (Man-Fre, 09:00 - 16:59)
    const erMarkedAaben = (dag >= 1 && dag <= 5) && (time >= 9 && time < 17)
    
    if (erMarkedAaben) {
      // Vis aktier når markedet er åbent
      await custom.aktier(column)
    } else {
      // Vis daglig vejrudsigt når markedet er lukket
      await custom.dailyWeather(column)
    }
  },

  async aktier(column) {
    let stocks = ["BIOPOR.CO", "NOVO-B.CO", "SAAB-B.ST", "PSNY"]
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

  async dailyWeather(column) {
    // Hent vejrdata
    if (!code.data.weather) { await code.setupWeather() }
    if (!code.data.sun) { await code.setupSunrise() }

    const weatherData = code.data.weather
    const weatherSettings = code.settings.weather

    const weatherStack = column.addStack()
    weatherStack.layoutVertically()
    weatherStack.setPadding(0, 0, 0, 0)

    // Dage på dansk
    const dageKort = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"]
    const idag = new Date()

    // Vis de næste 3 dage (starter fra i dag eller i morgen)
    for (let i = 0; i <= 2; i++) {
      const dayData = weatherData.forecast[i]
      const dayDate = new Date(idag)
      dayDate.setDate(idag.getDate() + i)
      
      const dayStack = code.align(weatherStack)
      dayStack.layoutHorizontally()
      dayStack.centerAlignContent()
      dayStack.setPadding(code.padding/2, code.padding, code.padding/2, code.padding)

      // Dag (fx "Tir")
      const dagNavn = dageKort[dayDate.getDay()]
      const dayText = code.provideText(dagNavn, dayStack, code.format.tinyTemp)
      dayText.font = Font.semiboldSystemFont(11)
      dayText.textColor = Color.white()
      
      dayStack.addSpacer(8)

      // Vejrikon
      const conditionIcon = dayStack.addImage(code.provideConditionSymbol(dayData.Condition, false))
      conditionIcon.imageSize = new Size(16, 16)
      code.tintIcon(conditionIcon, code.format.tinyTemp)
      
      dayStack.addSpacer(8)

      // Høj temperatur
      const highTemp = code.displayNumber(dayData.High, "--")
      const highText = code.provideText(highTemp, dayStack, code.format.smallTemp)
      highText.font = Font.semiboldSystemFont(12)
      highText.textColor = Color.white()
      
      dayStack.addSpacer(4)

      // Temperatur bar (visuelt element)
      const barStack = dayStack.addStack()
      barStack.layoutVertically()
      barStack.centerAlignContent()
      
      // Simpel orange/rød bar som i billedet
      const barWidth = 30
      const barHeight = 3
      
      const barCanvas = new DrawContext()
      barCanvas.size = new Size(barWidth, barHeight)
      barCanvas.opaque = false
      
      // Gradient farve baseret på temperatur
      const tempColor = dayData.High > 30 ? new Color("#FF6B6B") : 
                       dayData.High > 20 ? new Color("#FFA94D") :
                       new Color("#4A90E2")
      
      barCanvas.setFillColor(tempColor)
      barCanvas.fillRect(new Rect(0, 0, barWidth, barHeight))
      
      const barImg = dayStack.addImage(barCanvas.getImage())
      barImg.imageSize = new Size(barWidth, barHeight)
      
      dayStack.addSpacer(4)

      // Lav temperatur
      const lowTemp = code.displayNumber(dayData.Low, "--")
      const lowText = code.provideText(lowTemp, dayStack, code.format.smallTemp)
      lowText.font = Font.semiboldSystemFont(12)
      lowText.textColor = Color.white()
      lowText.textOpacity = 0.6
    }
  },

  async eventOrQuote(column) {
    try {
      // Ensure event data is available by calling Weather Cal's setupEvents
      if (!code.data.events) {
        await code.setupEvents()
      }
      
      // Check if there are any events (respecting Weather Cal's settings)
      if (code.data.events && code.data.events.length > 0) {
        // Show events using Weather Cal's event function
        await code.events(column)
      } else {
        // No events, show quote
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
      }
    } catch (error) {
      // If there's an error (e.g., no calendar permissions), fall back to quote
      console.error("Error in eventOrQuote:", error)
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
    }
  },

  async getOnlineQuote() {
    const cacheKey = "weather-cal-quote-cache"
    const historyKey = "weather-cal-quote-history"
    const cacheMaxAge = 3 * 60 * 60 * 1000 // 3 timer
    const maxHistorySize = 50 // Gem de sidste 50 quotes
    
    // Udvid API-listen med flere kilder
    const apiEndpoints = [
      {
        url: "https://api.quotable.io/random?maxLength=120&tags=wisdom|inspirational|famous-quotes",
        parser: (data) => ({ content: data.content, author: data.author }),
        name: "Quotable.io"
      },
      {
        url: "https://zenquotes.io/api/random",
        parser: (data) => {
          const quote = Array.isArray(data) ? data[0] : data
          return { content: quote.q, author: quote.a }
        },
        name: "ZenQuotes"
      },
      {
        url: "https://api.quotable.io/quotes/random?limit=1&minLength=50&maxLength=120",
        parser: (data) => {
          const quote = Array.isArray(data) ? data[0] : data
          return { content: quote.content, author: quote.author }
        },
        name: "Quotable Random"
      }
    ]
    
    // Større pool af fallback quotes
    const fallbackQuotes = [
      { content: "Livet er det, der sker, mens du er travlt optaget af at lave andre planer.", author: "John Lennon" },
      { content: "Vær den forandring, du ønsker at se i verden.", author: "Mahatma Gandhi" },
      { content: "Det eneste, vi skal frygte, er frygten selv.", author: "Franklin D. Roosevelt" },
      { content: "Succes er ikke endelig, fiasko er ikke fatal: Det er modet til at fortsætte, der tæller.", author: "Winston Churchill" },
      { content: "Din tid er begrænset, så spild den ikke på at leve andres liv.", author: "Steve Jobs" },
      { content: "Det er ikke de stærkeste, der overlever, men dem, der bedst kan tilpasse sig forandring.", author: "Charles Darwin" },
      { content: "Forestillingskraft er vigtigere end viden.", author: "Albert Einstein" },
      { content: "Hvis du kan drømme det, kan du gøre det.", author: "Walt Disney" },
      { content: "Måden at komme i gang på er at holde op med at snakke og begynde at gøre.", author: "Walt Disney" },
      { content: "Fremtiden tilhører dem, der tror på skønheden i deres drømme.", author: "Eleanor Roosevelt" },
      { content: "Man kan ikke vente til man har tid. Man må tage sig tid.", author: "Bertel Thorvaldsen" },
      { content: "Det, vi tænker, bliver vi.", author: "Buddha" },
      { content: "Hver mester var engang en begynder.", author: "Robin Sharma" },
      { content: "Held er, når forberedelse møder mulighed.", author: "Seneca" },
      { content: "At begynde er halvdelen af enhver handling.", author: "Græsk ordsprog" },
      { content: "En rejse på tusind mil begynder med ét skridt.", author: "Lao Tzu" },
      { content: "Det handler ikke om at vente på stormen til at passere, men om at lære at danse i regnen.", author: "Vivian Greene" },
      { content: "Liv er det, der sker, mens du laver andre planer.", author: "Allen Saunders" },
      { content: "Kvalitet er ikke en handling, det er en vane.", author: "Aristoteles" },
      { content: "Den eneste umulige rejse er den, du aldrig starter.", author: "Tony Robbins" },
      { content: "Gør i dag fantastisk.", author: "Ukendt" },
      { content: "Hver dag er en mulighed for at begynde forfra.", author: "Visdom" },
      { content: "Vær tålmodig med dig selv. Intet i naturen blomstrer året rundt.", author: "Naturen" },
      { content: "Fremskridt, ikke perfektion.", author: "Motivation" },
      { content: "Du er stærkere end du tror.", author: "Inspirator" }
    ]
    
    // Håndtering af quote-historik
    const historyFile = files.joinPath(files.documentsDirectory(), historyKey + ".json")
    let quoteHistory = []
    
    if (files.fileExists(historyFile)) {
      try {
        quoteHistory = JSON.parse(files.readString(historyFile))
      } catch (e) {
        console.error("Kunne ikke læse quote-historik:", e)
      }
    }
    
    // Håndtering af cache
    const cacheFile = files.joinPath(files.documentsDirectory(), cacheKey + ".json")
    let cachedQuote = null
    
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
    
    // Funktion til at tjekke om quote er i historik
    const isInHistory = (quote) => {
      return quoteHistory.some(h => h.content === quote.content)
    }
    
    // Forsøg at hente fra API'er
    for (const endpoint of apiEndpoints) {
      let attempts = 0
      const maxAttempts = 3
      
      while (attempts < maxAttempts) {
        try {
          console.log(`Forsøger ${endpoint.name} (forsøg ${attempts + 1}/${maxAttempts})`)
          const req = new Request(endpoint.url)
          req.timeoutInterval = 8
          
          const response = await req.loadJSON()
          const quote = endpoint.parser(response)
          
          // Tjek om quote er i historik
          if (isInHistory(quote) && attempts < maxAttempts - 1) {
            console.log(`Quote allerede vist - henter ny`)
            attempts++
            continue
          }
          
          // Gem i cache
          const cacheData = {
            quote: quote,
            timestamp: Date.now()
          }
          files.writeString(cacheFile, JSON.stringify(cacheData))
          
          // Tilføj til historik
          quoteHistory.unshift(quote)
          if (quoteHistory.length > maxHistorySize) {
            quoteHistory = quoteHistory.slice(0, maxHistorySize)
          }
          files.writeString(historyFile, JSON.stringify(quoteHistory))
          
          console.log(`Succes: Fik quote fra ${endpoint.name}`)
          return quote
          
        } catch (e) {
          console.error(`Fejl ved ${endpoint.name} (forsøg ${attempts + 1}):`, e)
          attempts++
        }
      }
    }
    
    // Alle API'er fejlede - brug fallback der IKKE er i historik
    let availableFallbacks = fallbackQuotes.filter(q => !isInHistory(q))
    
    if (availableFallbacks.length === 0) {
      console.log("Alle fallback quotes brugt - nulstiller historik")
      quoteHistory = []
      files.writeString(historyFile, JSON.stringify(quoteHistory))
      availableFallbacks = fallbackQuotes
    }
    
    const randomFallback = availableFallbacks[Math.floor(Math.random() * availableFallbacks.length)]
    
    // Gem fallback i historik
    quoteHistory.unshift(randomFallback)
    if (quoteHistory.length > maxHistorySize) {
      quoteHistory = quoteHistory.slice(0, maxHistorySize)
    }
    files.writeString(historyFile, JSON.stringify(quoteHistory))
    
    console.log("Bruger fallback quote:", randomFallback.content)
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
  },

  // Metode til at nulstille quote-historik
  resetQuoteHistory() {
    const historyFile = files.joinPath(files.documentsDirectory(), "weather-cal-quote-history.json")
    if (files.fileExists(historyFile)) {
      files.remove(historyFile)
    }
    console.log("Quote-historik nulstillet")
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
