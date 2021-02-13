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
const TIME_FORMAT = "DD/MM/yyyy HH:mm:ss"
const CACHE_LIFETIME = 3600 * 6 // 6 hours

interface OrbitInfo {
  satName: string;
  firstRow: string;
  secondRow: string;
}

interface SatsListReturnValues {
  section: string;
  sats: any[];
  cache: {
    isOutdated: boolean;
    hasProblems: boolean;
    update: () => any;
  };
}

export const getSatsList = async ({ section = null } = {}): Promise<SatsListReturnValues> => {
  try {
    const sectionName = section || celestrak[0]?.section

    if (!sectionName) {
      console.warn("No section was found in data/celestrack.json...")
      return Promise.resolve(null)
    }

    const sectionInfo = celestrak.find(({ section: s }) => s === sectionName)

    const cachePath = path.join(__dirname, `../data/cache/${base64.encode(sectionName)}.cache`)

    if (!fs.existsSync(cachePath)) {
      console.log("Creating cache for section:", sectionName)

      await updateCache({ cachePath, url: sectionInfo.url })
    }

    const fileBuffer = fs.readFileSync(cachePath)
    const fileContent = Buffer.from(fileBuffer).toString()
    const { data: rawData, created } = JSON.parse(fileContent)
    const data = base64.decode(rawData)

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
      cache: {
        update: () => cachePath && sectionInfo.url && updateCache({ cachePath, url: sectionInfo.url }),
        isOutdated: moment(created).diff(Date.now() - CACHE_LIFETIME * 1000) < 0,
        hasProblems: Boolean(!cachePath || !sectionInfo.url),
      },
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

interface UpdateCacheProps {
  cachePath: string;
  url: string;
}

const updateCache = async ({ cachePath, url }: UpdateCacheProps) => {
  console.log(`Updating cache... ${cachePath}`)

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

export const fetchFullData = async () => {
  const failed = []
  const success = []
  let fetched = 0

  const timeStart = Date.now()

  const cachePromises = celestrak.map(async ({ section, url }) => {
    try {
      const cacheFilename = `${base64.encode(section)}.cache`
      const cacheFilePath = path.join(__dirname, LOADED_FILES_PATH, cacheFilename)
      const cacheExists = fs.existsSync(cacheFilePath)

      if (!cacheExists) {
        await updateCache({ cachePath: cacheFilePath, url })
        fetched += 1

        console.log(`Created cache for ${cacheFilename}`)
      } else {
        const cacheBuffer = fs.readFileSync(cacheFilePath)
        const cacheValues = Buffer.from(cacheBuffer).toString()

        const parsedCache = JSON.parse(cacheValues)
        const { created } = parsedCache

        const cacheIsOutdated = moment(created).diff(Date.now() - (CACHE_LIFETIME * 1000)) < 0

        if (cacheIsOutdated) {
          console.log(`Updated outdated cache ${cacheFilename}`)

          fetched += 1
          updateCache({ cachePath: cacheFilePath, url })
        }
      }

      success.push({ section, url })
    } catch (error) {
      console.log(error)

      failed.push({ section, url, error })
    } finally {
      return Promise.resolve()
    }
  })

  await Promise.all(cachePromises)

  const timeEnd = Date.now()
  const cacheGatherTime = (timeEnd - timeStart) / 1000
  const cacheFileInfoPath = path.join(__dirname, "../data/cache.json")

  fs.writeFileSync(cacheFileInfoPath, JSON.stringify({
    lastUpdated: Date.now(),
    failed: failed.length,
    success: success.length,
    cacheGatherTime,
    itemsFetched: fetched,
  }), { flag: "w" })

  return Promise.resolve({
    failed,
    success,
    cacheGatherTime,
    itemsFetched: fetched,
  })
}
