(function loadTechPulseData() {
  const params = new URLSearchParams(location.search);
  const requested = params.get("source");
  const allowed = new Set(["demo", "generated"]);

  if (allowed.has(requested)) {
    localStorage.setItem("techpulse-data-source", requested);
  }

  const source = allowed.has(requested)
    ? requested
    : localStorage.getItem("techpulse-data-source") || "generated";
  const file = source === "generated" ? "data.generated.js" : "data.js";

  window.TechPulseDataSource = source;
  document.write(`<script src="./${file}"></scr` + `ipt>`);
})();
