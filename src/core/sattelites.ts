import axios from "axios"
import jspredict from "jspredict"
import moment from "moment"
import bearing from "quadrant-bearing"
import fs from "fs"
import path from "path"
import base64 from "base-64"

import { shortEnglishHumanizer } from "./utils"

import celestrak from "../data/celestrack.json"

const LOADED_FILES_PATH = "../data/cache"

interface OrbitInfo {
  satName: string;
  firstRow: string;
  secondRow: string;
}

export const getSatsList = async ({ section = null } = {}) => {
  try {
    const sectionName = section || celestrak[0]?.section

    if (!sectionName) {
      console.warn("No section was found in data/celestrack.json...")
      return Promise.resolve([])
    }

    const { url } = celestrak.find(({ section: s }) => s === sectionName)

    const { data } = await axios.get(url)

    const dataSplitted = data.split("\n")
    const dataList: OrbitInfo[]  = []

    dataSplitted.forEach((row, index) => {
      if (index % 3 !== 0 || !row) return

      const satName = row.trim()
      const firstRow = dataSplitted[index + 1].trim()
      const secondRow = dataSplitted[index + 2].trim()

      dataList.push({
        satName,
        firstRow,
        secondRow
      })
    })

    return Promise.resolve({
      section: sectionName,
      sats: dataList,
    })
  } catch (e) {
    console.log("Failed to fetch data from url...")
    console.error(e)
  }
}

export const predictPasses = ({
  sattelite,
  start = null,
  end = null,
  minimumElevation = 10,
  location = null,
}) => {
  const tle = `${sattelite.satName}\n${sattelite.firstRow}\n${sattelite.secondRow}`
  const qth = location || [48.522034, 25.036870, .1] // Location. For now defaulted to Ukraine, Kolomyia

  const passStart = start || Date.now() - 3600000
  const passEnd = end ||  Date.now() + 86400000

  const transits = jspredict.transits(tle, qth, passStart, passEnd, minimumElevation)
  const TIME_FORMAT = "DD/MM/yyyy HH:mm:ss"

  const formatTime = (timestamp) => ({
    timestamp,
    formatted: moment(timestamp).format(TIME_FORMAT),
  })

  const formatAzimuth = (degress) => ({
    formatted: bearing(Math.round(degress)),
    degress,
  })

  const passes = transits.map(({ start, end, duration, apexAzimuth, maxAzimuth, minAzimuth, ...rest }) => ({
    start: formatTime(start),
    end: formatTime(end),
    maxElevationTime: formatTime(start + (duration / 2)),
    apexAzimuth: formatAzimuth(apexAzimuth),
    maxAzimuth: formatAzimuth(maxAzimuth),
    minAzimuth: formatAzimuth(minAzimuth),
    duration: {
      seconds: duration,
      formatted: shortEnglishHumanizer(duration),
    },
    ...rest,
  }))

  return Promise.resolve(passes)
}

export const getSatInfo = ({ sattelite }) => {
  const tle = `${sattelite.satName}\n${sattelite.firstRow}\n${sattelite.secondRow}`

  const satInfo = jspredict.observe(tle, null)

  // Gotta format this data somehow (like add human readable velocity and etc.)
  return Promise.resolve(satInfo)
}

export const getSatsCategories = () => celestrak.map(({ section }) => section)

export const fetchFullData = async () => {
  const failed = []
  const success = []

  const promises = celestrak.map(({ section, url }, index) => {
    return new Promise(async () => {
      try {
        const updateCache = async (cachePath: string) => {
          const { data } = await axios.get(url, { timeout: 10000 })

          try {
            fs.writeFileSync(cachePath, JSON.stringify({
              created: Date.now(),
              data: base64.encode(data),
            }, null, 2), { flag: "w+" })

            return Promise.resolve()
          } catch (e) {
            return Promise.reject(e)
          }
        }

        const cacheFilename = `${base64.encode(section)}.cache`
        const cacheFilePath = path.join(__dirname, LOADED_FILES_PATH, cacheFilename)
        const cacheExists = fs.existsSync(cacheFilePath)

        if (!cacheExists) {
          await updateCache(cacheFilePath)
          console.log(`Updated cache for ${cacheFilename}`)
        } else {
          const cacheBuffer = fs.readFileSync(cacheFilePath)
          const cacheValues = Buffer.from(cacheBuffer).toString()

          if (index === 0) {
            const parsedCache = JSON.parse(cacheValues)
            const { data, created } = parsedCache

            console.log("first value:")
            console.log({
              section,
              data: `length is ${data.length}`,
              created,
            })
          }

          // console.log(`Reading cache values... ${cacheValues && cacheValues.length}`)
        }

        success.push({ section, url })
      } catch (error) {
        console.log(error)

        failed.push({ section, url, error })
      } finally {
        return Promise.resolve()
      }
    })
  })

  console.log("failed: ", failed)

  await Promise.all(promises)

  return Promise.resolve('done')
}