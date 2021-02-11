(async () => {
  const axios = require('axios')
  const url = "http://celestrak.com/norad/elements/weather.txt"

  try {
    const { data } = await axios.get(url)
    const dataSplitted = data.split("\n")
    const dataList = []

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

    console.log(dataList)
  } catch (e) {
    console.log("Failed to fetch data from url...")
    console.error(e)
  }
})()