(function loadTechPulseProducts() {
  const params = new URLSearchParams(location.search);
  const requested = params.get("source");
  const source = requested === "demo" || requested === "generated" ? requested : window.TechPulseDataSource || "generated";
  const file = source === "generated" ? "product-data.generated.js" : "product-data.js";
  const cacheKey = source === "generated" ? Date.now() : "demo";

  window.TechPulseProductsReady = fetch(`./${file}?v=${cacheKey}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Product data request failed: ${response.status}`);
      return response.text();
    })
    .then((text) => {
      const prefix = "window.TechPulseProducts = ";
      if (!text.startsWith(prefix)) throw new Error("Product data format is invalid.");
      const json = text.slice(prefix.length).trim().replace(/;\s*$/, "");
      window.TechPulseProducts = JSON.parse(json);
      return window.TechPulseProducts;
    })
    .catch((error) => {
      console.error("Unable to load TechPulse products", error);
      window.TechPulseProducts = window.TechPulseProducts || { products: [] };
      return window.TechPulseProducts;
    });
})();
