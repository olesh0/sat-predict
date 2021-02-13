import { getSatsList, predictPasses, getSatInfo, getSatsCategories, fetchFullData } from "./core/sattelites"
import celestrack from "./data/celestrack.json"

getSatsList({ section: celestrack.find(() => Math.random() > 0.5)?.section }).then(async ({ sats, section, cache }) => {
  // fetchFullData().then(console.log)

  cache.isOutdated && !cache.hasProblems && cache.update()

  const sat = sats[0]

  console.log(`We have list of ${sats.length} sats. Section: "${section}"`)

  if (sat) {
    console.log(sat.satName)

    getSatInfo({ sattelite: sat }).then(console.log)
    // predictPasses({ sattelite: sat }).then(console.log)
  } else console.log("Couldn't find sattelite by name")
}).catch(console.error)
