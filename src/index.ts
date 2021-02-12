import { getSatsList, predictPasses, getSatInfo, getSatsCategories } from "./core/sattelites"

getSatsList().then(async (sats) => {
  console.log(sats)

  // const noaa19 = sats.find(({ satName }) => satName === "NOAA 19")

  // if (noaa19) {
  //   console.log("NOAA 19 Location:")

  //   // predictPasses({ sattelite: noaa19 }).then(console.log)
  //   // getSatInfo({ sattelite: noaa19 })
  // } else console.log("Couldn't find sattelite by name")
}).catch(console.error)
