import humanizeDuration from "humanize-duration"

export const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: "shortEn",
  spacer: "",
  round: true,
  serialComma: false,
  delimiter: " ",
  languages: {
    shortEn: {
      y: () => "y",
      mo: () => "mo",
      w: () => "w",
      d: () => "d",
      h: () => "h",
      m: () => "m",
      s: () => "s",
      ms: () => "ms",
    },
  },
})
