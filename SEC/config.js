window.SEC_CONFIG = {
  dataSource: "supabase",
  allowStaticDataFallback: true,
  supabaseUrl: window.EHOCKEY_CONFIG?.supabaseUrl || "",
  supabasePublishableKey: window.EHOCKEY_CONFIG?.supabasePublishableKey || "",
  supabaseCupTable: "sec_site_cup_sources",
  summer26SignupsUrl: "./sec-sommar-26-anmalda.json",
  dataUrls: [
    "./database-cups-1-13.json",
    "./database-cups-14-20.json",
    "./database-cups.json"
  ],
  sheetUrl: "./database-cups-1-13.json",
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
  databaseUrl: "./database-cups.json",
  teamLogoBaseUrl: "https://sweehockey-svg.github.io/teamlogos",
  playerImageBaseUrl: "https://sweehockey-svg.github.io/players",
  siteAssetBaseUrl: "https://sweehockey-svg.github.io/assets",
  teamLogoManifestUrl: "https://api.github.com/repos/sweehockey-svg/sweehockey-svg.github.io/contents/teamlogos",
  playerImageManifestUrl: "https://api.github.com/repos/sweehockey-svg/sweehockey-svg.github.io/contents/players",
  manualUpdateWorkflowUrl: "https://github.com/sweehockey-svg/sweehockey-svg.github.io/actions/workflows/sync-sec-site-data.yml",
  manualUpdateEndpointUrl: "",
  signupApiUrl: "https://script.google.com/macros/s/AKfycbxhNNjRiz7OcrT2zDrGgj_h2GCkkWYOjDo7oq4xRhXH6socZXc6dmJFpZHPRuTpnUoI/exec"
};
