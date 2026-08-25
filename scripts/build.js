/**
 * Build script de META Healthy Meals.
 *
 * Lee /content (editado a mano, o vía el panel /admin con Decap CMS) y:
 *   1. Genera assets/js/data.js  -> platos, precios y FAQ, en el mismo
 *      formato que ya usa el sitio para armar packs, calcular macros y
 *      mandar el pedido por WhatsApp.
 *   2. Genera assets/js/content.js -> un objeto CONTENT con todos los
 *      textos editables del sitio (home, metas, institucional, regalá,
 *      entrega, datos generales). Las páginas ya tienen atributos
 *      data-content="..." marcando qué texto va en cada lugar; ese
 *      binding lo resuelve main.js en el navegador.
 *   3. Copia /src (HTML, CSS, JS, imágenes) y /admin adentro de /dist,
 *      que es lo que Netlify publica.
 *
 * No hay ningún framework de frontend ni de build: es un script chico y
 * legible a propósito, para que se pueda tocar sin depender de nadie.
 *
 * Uso: node scripts/build.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const SRC = path.join(ROOT, "src");
const ADMIN = path.join(ROOT, "admin");
const DIST = path.join(ROOT, "dist");

const SITE_URL = "https://metahealthymeals.com.ar"; // actualizar cuando el dominio final esté definido

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  ensureDir(to);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function loadDishes() {
  const dir = path.join(CONTENT, "dishes");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJSON(path.join(dir, f)))
    .sort((a, b) => (a.orden || 999) - (b.orden || 999));
}

// Orden fijo de categorías en el menú (si aparece una categoría nueva en
// algún plato, se agrega sola al final).
const CATEGORY_ORDER = ["Pollo", "Carne", "Wraps", "Bowls y Woks"];

function buildDataJS(dishes, site, faq) {
  const categories = Array.from(new Set(dishes.map((d) => d.categoria)));
  categories.sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const dishesJS = dishes.map((d) => ({
    id: d.slug,
    cat: d.categoria,
    name: d.nombre,
    desc: d.descripcion,
    // Se guardan los 3 valores ya calculados (uno por meta), en vez de un
    // multiplicador: así lo que se ve en el panel es el número real que
    // va a aparecer en el sitio, sin fórmulas raras.
    definir: d.definir,
    mantener: d.mantener,
    construir: d.construir,
  }));

  const metaFactorsJS = {
    definir: { kcal: 1, protein: 1, carbs: 1, fat: 1 },
    mantener: { kcal: 1, protein: 1, carbs: 1, fat: 1 },
    construir: { kcal: 1, protein: 1, carbs: 1, fat: 1 },
  };

  return `/* ==========================================================================
   META Healthy Meals — DATA
   Generado automáticamente por scripts/build.js a partir de /content.
   NO EDITAR A MANO: los cambios se pierden en el próximo build.
   Para editar platos, precios o preguntas frecuentes, usar /admin o los
   archivos JSON dentro de /content.
   ========================================================================== */

const PHONE_PRIMARY = '${site.telefono_whatsapp_principal}';
const PHONE_SECONDARY = '${site.telefono_whatsapp_secundario}';

const DISHES = ${JSON.stringify(dishesJS, null, 2)};
const DISH_MAP = Object.fromEntries(DISHES.map(d => [d.id, d]));
const CATEGORIES = ${JSON.stringify(categories)};

// Los platos ya vienen con los 3 valores calculados por meta (arriba), así
// que acá los factores son neutros (x1). Se deja este objeto porque el
// resto del sitio lo usa para mostrar la etiqueta de cada meta (Definir,
// Mantener, Construir) en botones, mensajes de WhatsApp, etc.
const META_FACTORS = {
  definir:   { label:'${site.metas_definir_nombre}',   desc:'${escapeJs(site.metas_definir_desc)}',   ...${JSON.stringify(metaFactorsJS.definir)} },
  mantener:  { label:'${site.metas_mantener_nombre}',  desc:'${escapeJs(site.metas_mantener_desc)}',  ...${JSON.stringify(metaFactorsJS.mantener)} },
  construir: { label:'${site.metas_construir_nombre}', desc:'${escapeJs(site.metas_construir_desc)}', ...${JSON.stringify(metaFactorsJS.construir)} },
};

function scaleDish(dish, metaKey){
  // Los macros ya están calculados por meta en cada plato (dish[metaKey]),
  // así que esta función simplemente los devuelve con los nombres que
  // espera el resto del sitio.
  const m = dish[metaKey] || dish.mantener;
  return { kcal:m.kcal, p:m.proteinas, c:m.carbohidratos, f:m.grasas };
}

const PRICING = {
  individual: ${site.precio_vianda_individual},
  packs: {
    '7':{ unit:${site.precio_pack_7_unidad} },
    '14':{ unit:${site.precio_pack_14_unidad} },
    '28':{ unit:${site.precio_pack_28_unidad} }
  },
};

const DELIVERY = {
  orderDeadline: '${escapeJs(site.dias_pedido_limite)}',
  deliveryDays: '${escapeJs(site.dias_entrega)}',
  zone: '${escapeJs(site.zona_entrega)}',
  shippingCost: ${site.costo_envio},
  pickupAddress: '${escapeJs(site.direccion)}',
  pickupDays: '${escapeJs(site.dias_retiro)}',
};

const FAQ_DATA = ${JSON.stringify(faq.preguntas.map(p => ({ q: p.pregunta, a: p.respuesta })), null, 2)};
`;
}

function escapeJs(str) {
  return String(str || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

function buildContentJS({ site, home, metas, institucional, regala, entrega }) {
  const content = { site, home, metas, institucional, regala, entrega };
  return `/* ==========================================================================
   META Healthy Meals — CONTENT
   Generado automáticamente por scripts/build.js a partir de /content/*.json.
   NO EDITAR A MANO: los cambios se pierden en el próximo build.
   main.js lee este objeto y completa cualquier elemento con
   data-content="ruta.al.campo" en el HTML.
   ========================================================================== */

const CONTENT = ${JSON.stringify(content, null, 2)};
`;
}

function build() {
  console.log("Generando sitio META Healthy Meals...\n");

  fs.rmSync(DIST, { recursive: true, force: true });
  ensureDir(DIST);

  // ---- Leer contenido ----
  const siteRaw = readJSON(path.join(CONTENT, "site.json"));
  const home = readJSON(path.join(CONTENT, "home.json"));
  const metas = readJSON(path.join(CONTENT, "metas.json"));
  const institucional = readJSON(path.join(CONTENT, "institucional.json"));
  const regala = readJSON(path.join(CONTENT, "regala.json"));
  const entrega = readJSON(path.join(CONTENT, "entrega.json"));
  const faq = readJSON(path.join(CONTENT, "faq.json"));
  const dishes = loadDishes();

  // Unos pocos campos que necesita data.js pero viven en metas.json, no en site.json.
  const site = {
    ...siteRaw,
    metas_definir_nombre: metas.definir.nombre,
    metas_definir_desc: metas.definir.descripcion_larga,
    metas_mantener_nombre: metas.mantener.nombre,
    metas_mantener_desc: metas.mantener.descripcion_larga,
    metas_construir_nombre: metas.construir.nombre,
    metas_construir_desc: metas.construir.descripcion_larga,
    whatsapp_href_principal: `https://wa.me/${siteRaw.telefono_whatsapp_principal}`,
    whatsapp_href_secundario: `https://wa.me/${siteRaw.telefono_whatsapp_secundario}`,
    direccion_display: `📍 ${siteRaw.direccion}`,
    telefono_display_principal_icon: `📲 ${siteRaw.telefono_display_principal}`,
    telefono_display_secundario_icon: `📲 ${siteRaw.telefono_display_secundario}`,
  };

  console.log(`  ${dishes.length} plato(s) cargado(s) desde content/dishes/`);
  console.log(`  ${faq.preguntas.length} pregunta(s) frecuente(s)`);

  // ---- Copiar el sitio estático (HTML, CSS, JS, imágenes) ----
  copyDir(SRC, DIST);

  // ---- Generar assets/js/data.js y assets/js/content.js dentro de dist ----
  const jsDir = path.join(DIST, "assets", "js");
  ensureDir(jsDir);
  fs.writeFileSync(path.join(jsDir, "data.js"), buildDataJS(dishes, site, faq));
  console.log("  -> assets/js/data.js");
  fs.writeFileSync(
    path.join(jsDir, "content.js"),
    buildContentJS({ site, home, metas, institucional, regala, entrega })
  );
  console.log("  -> assets/js/content.js");

  // ---- Panel admin (Decap CMS) ----
  copyDir(ADMIN, path.join(DIST, "admin"));
  console.log("  -> admin/");

  // ---- sitemap.xml / robots.txt ----
  // Netlify Identity necesita poder cargar /admin sin que un redirect de
  // SPA lo intercepte, así que se deja afuera del sitemap (no es una
  // página de contenido) y se lo marca "Disallow" en robots.txt.
  const pages = fs.readdirSync(SRC).filter((f) => f.endsWith(".html"));
  const urls = pages.map((f) => (f === "index.html" ? "/" : `/${f}`));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap);
  fs.writeFileSync(
    path.join(DIST, "robots.txt"),
    `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
  console.log("  -> sitemap.xml, robots.txt");

  console.log(`\nListo. Sitio generado en /dist`);
}

build();
