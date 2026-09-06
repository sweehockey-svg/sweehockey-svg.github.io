window.SEC_CONFIG = {
  dataSource: "supabase",
  allowStaticDataFallback: false,
  supabaseUrl: window.EHOCKEY_CONFIG?.supabaseUrl || "",
  supabasePublishableKey: window.EHOCKEY_CONFIG?.supabasePublishableKey || "",
  supabaseCupTable: "sec_site_cup_sources",
  summer26SignupsUrl: "",
  dataUrls: [],
  sheetUrl: "",
  rulesUrl: "",
  placementsUrl: "",
  rawDataApiBaseUrl: "",
  dnfTeamsByCup: {
    "SEC 20 DIV 2": ["Dynamite sharks"]
  },
  cupSettingsOverrides: {
    "SEC 14": {
      playoffCut1: 3,
      playoffCut2: 5
    }
  },
  databaseUrl: "",
  teamLogoBaseUrl: "https://sweehockey-svg.github.io/teamlogos",
  playerImageBaseUrl: "https://sweehockey-svg.github.io/players",
  siteAssetBaseUrl: "https://sweehockey-svg.github.io/assets",
  teamLogoManifestUrl: "https://api.github.com/repos/sweehockey-svg/sweehockey-svg.github.io/contents/teamlogos",
  playerImageManifestUrl: "https://api.github.com/repos/sweehockey-svg/sweehockey-svg.github.io/contents/players",
  signupApiUrl: "https://script.google.com/macros/s/AKfycbxhNNjRiz7OcrT2zDrGgj_h2GCkkWYOjDo7oq4xRhXH6socZXc6dmJFpZHPRuTpnUoI/exec"
};
