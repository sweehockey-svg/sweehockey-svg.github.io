(function () {
  "use strict";

  const ORIGINAL_FETCH = window.fetch.bind(window);
  let pendingUpdateMode = "";

  /*
   * app-modern.js känner redan till adminlösenordet efter att Admin
   * låsts upp. Vi behåller därför dess befintliga click-handler och
   * lägger bara till vilket uppdateringsläge som ska skickas.
   */
  window.fetch = function (input, init) {
    const endpoint = String(
      window.SEC_CONFIG?.manualUpdateEndpointUrl || ""
    );

    const requestUrl =
      typeof input === "string"
        ? input
        : String(input?.url || "");

    if (
      endpoint
      && requestUrl === endpoint
      && init
      && String(init.method || "GET").toUpperCase() === "POST"
      && init.body instanceof URLSearchParams
      && !init.body.has("action")
      && pendingUpdateMode
    ) {
      const body =
        new URLSearchParams(init.body);

      body.set(
        "action",
        pendingUpdateMode
      );

      pendingUpdateMode = "";

      return ORIGINAL_FETCH(
        input,
        Object.assign(
          {},
          init,
          { body }
        )
      );
    }

    return ORIGINAL_FETCH(
      input,
      init
    );
  };

  injectStyles();
  patchAdminPanel();

  const observer =
    new MutationObserver(
      patchAdminPanel
    );

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  function patchAdminPanel() {
    const panel =
      document.querySelector(
        ".adminUpdatePanel"
      );

    const originalButton =
      panel?.querySelector(
        "[data-admin-update]"
      );

    if (
      !panel
      || !originalButton
      || panel.querySelector(
        "[data-admin-update-actions]"
      )
    ) {
      return;
    }

    originalButton.hidden = true;

    const actions =
      document.createElement("div");

    actions.className =
      "adminUpdateActions";

    actions.setAttribute(
      "data-admin-update-actions",
      ""
    );

    const latestButton =
      createButton(
        "Senaste cup + Google Sheet",
        "latest",
        false
      );

    const allButton =
      createButton(
        "Uppdatera allt",
        "all",
        true
      );

    actions.append(
      latestButton,
      allButton
    );

    originalButton.insertAdjacentElement(
      "afterend",
      actions
    );

    function createButton(
      label,
      mode,
      secondary
    ) {
      const button =
        document.createElement("button");

      button.type = "button";
      button.textContent = label;

      button.className =
        secondary
          ? "adminUpdateModeButton secondary"
          : "adminUpdateModeButton";

      button.dataset.updateMode =
        mode;

      button.addEventListener(
        "click",
        function () {
          if (
            mode === "all"
            && !window.confirm(
              "Uppdatera all SportsGamer-data och Google Sheet?\n\n"
              + "Detta är den långsamma fulla uppdateringen."
            )
          ) {
            return;
          }

          pendingUpdateMode =
            mode;

          originalButton.click();
        }
      );

      return button;
    }
  }

  function injectStyles() {
    if (
      document.querySelector(
        "#sec-admin-update-mode-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "sec-admin-update-mode-styles";

    style.textContent = `
      .adminUpdateActions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
      }

      .adminUpdateActions .adminUpdateModeButton {
        white-space: nowrap;
      }

      .adminUpdateActions .adminUpdateModeButton.secondary {
        background: transparent;
        color: #d6b15f;
        border-color: rgba(214, 177, 95, .72);
      }

      .adminUpdateActions .adminUpdateModeButton.secondary:hover {
        background: rgba(214, 177, 95, .08);
      }

      @media (max-width: 720px) {
        .adminUpdateActions {
          width: 100%;
          justify-content: stretch;
        }

        .adminUpdateActions .adminUpdateModeButton {
          flex: 1 1 220px;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }
}());
