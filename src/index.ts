import { getSatsList, predictPasses, getSatInfo, getSatsCategories, fetchFullData } from "./core/sattelites"

getSatsList().then(async ({ sats, section }: { sats: any[], section: string }) => {
  fetchFullData().then(console.log)

  // const sat = sats[0]

  // console.log(`We have list of ${sats.length} sats. Section: "${section}"`)

  // if (sat) {
  //   // console.log(sat.satName)

  //   // predictPasses({ sattelite: sat }).then(console.log)
  // } else console.log("Couldn't find sattelite by name")
}).catch(console.error)
