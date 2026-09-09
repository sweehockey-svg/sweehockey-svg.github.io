/*
  SEC – approved Svensk eHockey "Min profil" data on SEC player profiles.

  Source of truth:
  - public.v_ehockey_player_self_profiles_public

  This module does not create a separate SEC profile store. It only reads the
  already approved public profile data and presents it inside the existing SEC
  player/goalie profile UI.

  No MutationObserver and no recurring polling.
*/
(function () {
  "use strict";

  let publicProfilesPromise = null;
  let renderGeneration = 0;

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function compactKey(value) {
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("sv-SE")
      .replace(/[^a-z0-9]+/g, "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function isPersonRoute() {
    const hash = String(location.hash || "");
    return hash.startsWith("#/players/") || hash.startsWith("#/goalies/");
  }

  function getSupabaseConfig() {
    const url = text(window.SEC_CONFIG?.supabaseUrl || window.EHOCKEY_CONFIG?.supabaseUrl).replace(/\/+$/, "");
    const key = text(window.SEC_CONFIG?.supabasePublishableKey || window.EHOCKEY_CONFIG?.supabasePublishableKey);
    return { url: url, key: key };
  }

  async function loadApprovedProfiles() {
    if (publicProfilesPromise) return publicProfilesPromise;

    publicProfilesPromise = (async function () {
      const config = getSupabaseConfig();
      if (!config.url || !config.key) return new Map();

      const query = new URLSearchParams({
        select: "player_key,display_gamertag,source_player_image,image_url,presentation,positions_text,contact,twitch_url,x_url,instagram_url,availability_status,team_status",
        limit: "5000"
      });

      const response = await fetch(
        config.url + "/rest/v1/v_ehockey_player_self_profiles_public?" + query.toString(),
        {
          cache: "no-store",
          headers: {
            apikey: config.key,
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Supabase svarade " + response.status);
      }

      const rows = await response.json();
      const map = new Map();
      (Array.isArray(rows) ? rows : []).forEach(function (row) {
        const key = compactKey(row?.display_gamertag);
        if (key && !map.has(key)) map.set(key, row);
      });
      return map;
    })().catch(function (error) {
      console.warn("SEC: kunde inte hämta godkända Min profil-uppgifter", error);
      return new Map();
    });

    return publicProfilesPromise;
  }

  function discordContact(value) {
    const raw = text(value);
    const match = raw.match(/^discord\s*:\s*(.+)$/i);
    return match ? text(match[1]) : "";
  }

  function ensureStyles() {
    if (document.querySelector("#secSelfProfileStyles")) return;
    const style = document.createElement("style");
    style.id = "secSelfProfileStyles";
    style.textContent = `
      .secSelfSocials{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px}
      .secSelfSocials a,.secSelfSocials span{display:inline-flex;align-items:center;gap:7px;min-height:32px;padding:7px 11px;border:1px solid rgba(205,169,83,.35);border-radius:999px;background:rgba(3,10,17,.76);color:#edf2f5;text-decoration:none;font-size:12px;font-weight:800}
      .secSelfSocials a:hover,.secSelfSocials a:focus-visible{border-color:#e4c16a;background:rgba(205,169,83,.10);color:#f4cf72;outline:none}
      .secSelfSocialsX{min-width:38px!important;justify-content:center;padding-inline:9px!important;color:#4edbd1!important;font-size:16px!important}
      .secSelfSocialsMark{display:grid;place-items:center;min-width:17px;height:17px;color:#4edbd1;font-size:11px;font-weight:950}
      .secSelfDiscord{border-color:rgba(78,219,209,.30)!important;color:#d8f7f4!important}
      .secSelfProfileBox{margin:0 0 18px;padding:15px 16px;border:1px solid rgba(205,169,83,.28);border-left:3px solid #d6b15f;border-radius:12px;background:linear-gradient(135deg,rgba(8,18,27,.94),rgba(3,8,14,.82))}
      .secSelfProfileBoxHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
      .secSelfProfileBoxHead>div{display:grid;gap:2px}
      .secSelfProfileBoxHead span{color:#4edbd1;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .secSelfProfileBoxHead strong{font-family:"Barlow Condensed",sans-serif;color:#f3f0e8;font-size:22px;line-height:1}
      .secSelfProfileApproved{padding:4px 7px;border:1px solid rgba(78,219,209,.28);border-radius:999px;color:#71d9d1;font-size:9px;font-style:normal;font-weight:900;letter-spacing:.08em;white-space:nowrap}
      .secSelfProfilePresentation{margin:0 0 12px;color:#d4dce2;font-size:14px;line-height:1.55}
      .secSelfProfileFacts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .secSelfProfileFacts>div{padding:8px 9px;border:1px solid rgba(53,75,88,.72);border-radius:8px;background:rgba(0,7,12,.48)}
      .secSelfProfileFacts span{display:block;margin-bottom:2px;color:#8198a7;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      .secSelfProfileFacts strong{display:block;color:#eef2f4;font-size:12px;line-height:1.35;word-break:break-word}
      @media(max-width:760px){.secSelfProfileFacts{grid-template-columns:1fr}.secSelfProfileBox{padding:13px}.secSelfProfileBoxHead{align-items:flex-start}.secSelfSocials{gap:6px}.secSelfSocials a,.secSelfSocials span{padding:6px 9px;font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function removeEnhancements() {
    document.querySelector("#secSelfSocials")?.remove();
    document.querySelector("#secSelfProfileBox")?.remove();
  }

  function socialMarkup(row) {
    const items = [];
    const xUrl = text(row?.x_url);
    const twitchUrl = text(row?.twitch_url);
    const instagramUrl = text(row?.instagram_url);
    const discord = discordContact(row?.contact);

    if (/^https?:\/\//i.test(xUrl)) {
      items.push(`<a class="secSelfSocialsX" href="${escapeAttribute(xUrl)}" target="_blank" rel="noopener noreferrer" aria-label="X" title="X">𝕏</a>`);
    }
    if (/^https?:\/\//i.test(twitchUrl)) {
      items.push(`<a href="${escapeAttribute(twitchUrl)}" target="_blank" rel="noopener noreferrer"><span class="secSelfSocialsMark">TV</span>Twitch</a>`);
    }
    if (/^https?:\/\//i.test(instagramUrl)) {
      items.push(`<a href="${escapeAttribute(instagramUrl)}" target="_blank" rel="noopener noreferrer"><span class="secSelfSocialsMark">IG</span>Instagram</a>`);
    }
    if (discord) {
      items.push(`<span class="secSelfDiscord"><span class="secSelfSocialsMark">D</span>Discord: ${escapeHtml(discord)}</span>`);
    }
    return items.join("");
  }

  function profileFacts(row) {
    const discord = discordContact(row?.contact);
    return [
      ["Positioner", row?.positions_text],
      ["Status", row?.availability_status],
      ["Lagstatus", row?.team_status],
      ["Kontakt", discord ? "" : row?.contact]
    ].map(function (item) {
      return [item[0], text(item[1])];
    }).filter(function (item) {
      return Boolean(item[1]);
    });
  }

  function applyProfileRow(row) {
    if (!row || !isPersonRoute()) return false;

    const hero = document.querySelector(".playerProfileHero");
    const profileCopy = hero?.querySelector(".profileCopy");
    const profileMeta = profileCopy?.querySelector(".profileMeta");
    const bioPanel = hero?.querySelector(".personBioPanel");
    const heroImage = hero?.querySelector(".playerPortraitHero img");
    const visibleName = text(profileCopy?.querySelector("h2")?.textContent);

    if (!hero || !profileCopy || !profileMeta || !bioPanel || !visibleName) return false;

    ensureStyles();
    removeEnhancements();

    const approvedImage = text(row.image_url);
    if (/^https?:\/\//i.test(approvedImage) && heroImage && heroImage.src !== approvedImage) {
      const previousSrc = heroImage.src;
      heroImage.onerror = function () {
        heroImage.onerror = null;
        heroImage.src = previousSrc;
      };
      heroImage.src = approvedImage;
    }

    const socialsMarkup = socialMarkup(row);
    if (socialsMarkup) {
      const socials = document.createElement("div");
      socials.id = "secSelfSocials";
      socials.className = "secSelfSocials";
      socials.setAttribute("aria-label", "Spelarens sociala länkar och kontakt");
      socials.innerHTML = socialsMarkup;
      profileMeta.insertAdjacentElement("afterend", socials);
    }

    const presentation = text(row.presentation);
    const facts = profileFacts(row);
    if (presentation || facts.length) {
      const box = document.createElement("section");
      box.id = "secSelfProfileBox";
      box.className = "secSelfProfileBox";
      box.setAttribute("aria-label", "Profiluppgifter från spelaren");
      box.innerHTML = `
        <div class="secSelfProfileBoxHead">
          <div><span>Från spelaren</span><strong>Om ${escapeHtml(visibleName)}</strong></div>
          <em class="secSelfProfileApproved">ADMIN GODKÄND</em>
        </div>
        ${presentation ? `<p class="secSelfProfilePresentation">${escapeHtml(presentation)}</p>` : ""}
        ${facts.length ? `<div class="secSelfProfileFacts">${facts.map(function (fact) {
          return `<div><span>${escapeHtml(fact[0])}</span><strong>${escapeHtml(fact[1])}</strong></div>`;
        }).join("")}</div>` : ""}
      `;
      bioPanel.insertAdjacentElement("afterbegin", box);
    }

    return true;
  }

  async function tryEnhance() {
    if (!isPersonRoute()) {
      removeEnhancements();
      return false;
    }

    const name = text(document.querySelector(".playerProfileHero .profileCopy h2")?.textContent);
    if (!name) return false;

    const profiles = await loadApprovedProfiles();
    const row = profiles.get(compactKey(name));
    if (!row) {
      removeEnhancements();
      return false;
    }

    return applyProfileRow(row);
  }

  function scheduleEnhancement() {
    const generation = ++renderGeneration;
    removeEnhancements();
    if (!isPersonRoute()) return;

    [0, 80, 180, 350, 650, 1100, 1800, 2800, 4200, 6000].forEach(function (delay) {
      window.setTimeout(function () {
        if (generation !== renderGeneration) return;
        void tryEnhance();
      }, delay);
    });
  }

  window.addEventListener("hashchange", scheduleEnhancement);
  window.addEventListener("pageshow", scheduleEnhancement);
  window.addEventListener("load", scheduleEnhancement);

  document.addEventListener("input", function (event) {
    if (event.target?.matches?.("[data-global-search]")) {
      window.setTimeout(scheduleEnhancement, 0);
    }
  });

  scheduleEnhancement();
})();
