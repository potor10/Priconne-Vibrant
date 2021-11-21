const Vibrant = require('node-vibrant')
const cheerio = require('cheerio')
const got = require("got")
const sharp = require('sharp')
const axios = require('axios')
const fs = require('fs')

href = "https://redive.estertion.win/card/full/"

const getVibrant = (url) => {
  let artwork = new Vibrant(url)
  return new Promise ((resolve, reject) => {
    artwork.getPalette((err, palette) => {
      if (err) {
        reject(err)
      }
      resolve(palette)
    })
  })
}

const scrapePng = async () => {
  const response = await got(href)
  let $ = cheerio.load(response.body)
  console.log(`--- Finding EsterTion Data From Units From: ${href}`)

  let total_count = 0
  url_arr = $('span > a').map(function (i, el) {
    total_count++
    return $(this).attr('href')
  }).toArray()

  console.log(`--- ${total_count} Available Units On EsterTion`)

  for(i = 0; i < total_count; i++) {
    let loaded = false
    while (!loaded) {
      try {
        let relative_src = url_arr[i]
        let full_id = relative_src.substring(0, 6)
        let src = href + relative_src
        
        const input = await axios({ url: src, responseType: "arraybuffer" }).catch((err) => {
          console.log(`Axios Error ${err}`)
        })

        await sharp(input.data).png().toFile(`images/${full_id}.png`).catch((err) => {
          console.log(`Sharp Error: ${err}`)
        })

        console.log(`${i+1}/${total_count}`)
        loaded = true
      } catch(e) {
        console.log(`--- Image Failed To Grab Cause Error ${e}... \n--- Retrying`)
      }
    }
  }

  return true
}

const generateJson = async () => {
  let priconne_colors = {}

  var files = fs.readdirSync('images/')
  console.log(files.length)

  for(i = 0; i < files.length; i++) {
    if (files[i].substr(-4) == '.png') {
      const vibrant_data = await getVibrant(`images/${files[i]}`)
      let vibrantColors = { 
        full_id: files[i].substring(0, 6),
        vibrant: vibrant_data.Vibrant.getHex(),
        darkVibrant: vibrant_data.DarkVibrant.getHex(),
        lightVibrant: vibrant_data.LightVibrant.getHex(),
        muted: vibrant_data.Muted.getHex(),
        darkMuted: vibrant_data.DarkMuted.getHex(),
        lightMuted: vibrant_data.LightMuted.getHex(),
      }

      let base_id = files[i].substring(0, 4)
      if (base_id in priconne_colors) {
        priconne_colors[base_id].push(vibrantColors)
      } else {
        priconne_colors[base_id] = [vibrantColors]
      }
    } else {
      console.log(`${files[i]} is not a png`)
    }
    console.log(`${i+1}/${files.length}`)
  }

  let json = JSON.stringify(priconne_colors)
  fs.writeFile('priconne_colors.json', json, 'utf8', (err) => {console.log(`Error Writing Files ${err}`)})
  console.log('Finished Writing Output')
}

const priconneVibrant = async () => {
  await scrapePng()
  generateJson()
}

priconneVibrant()
