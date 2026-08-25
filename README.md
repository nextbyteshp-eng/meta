# META Healthy Meals — sitio autoadministrable

Sitio estático (HTML/CSS/JS puro, sin frameworks de frontend) con:

- Las 7 páginas actuales del sitio (inicio, Definir, Mantener, Construir,
  Regalá un Pack, Días y zonas de entrega, Quiénes somos), tal cual están
  hoy — mismo diseño, mismo armador de packs, mismo flujo de WhatsApp.
- Panel de administración en `/admin` (Decap CMS) para que puedan editar
  todo sin tocar código: **las viandas del menú** (agregar, editar,
  borrar), los precios, los textos de cualquier sección, el WhatsApp, la
  dirección, las preguntas frecuentes, el carrusel del inicio y el link
  del mapa de entrega.

Todo el contenido vive en archivos dentro de `/content`. Un script de Node
(`scripts/build.js`) lee esos archivos y genera el sitio final, estático,
adentro de `/dist`. Ese `/dist` es lo que Netlify publica. Es exactamente
el mismo esquema que ya usamos en el sitio de Criadores del Sur.

## Cómo está armado

```
content/
  site.json           -> WhatsApp, dirección, horarios, precios, eslogan
  metas.json           -> textos de Definir, Mantener y Construir
  home.json             -> carrusel, "cómo funciona", "por qué META", etc.
  institucional.json     -> página "Quiénes somos"
  regala.json             -> página "Regalá un Pack META"
  entrega.json             -> página "Días y zonas de entrega" + mapa
  faq.json                  -> preguntas frecuentes
  dishes/*.json               -> una vianda por archivo
src/
  *.html                        -> las 7 páginas (con los textos ya
                                    marcados para que el panel los pueda
                                    reemplazar)
  assets/css/style.css            -> estilos
  assets/js/main.js                -> toda la lógica del sitio (menú,
                                       armador de packs, WhatsApp, etc.)
  assets/img/                       -> logo, favicon, íconos de las metas,
                                        fotos del carrusel
admin/
  index.html, config.yml              -> panel de administración (Decap CMS)
scripts/
  build.js                              -> el generador del sitio
dist/                                    -> se genera solo al correr el
                                             build (no se edita a mano)
```

Al correr el build, `scripts/build.js` junta el contenido de `/content`
con las páginas de `/src` y genera dos archivos nuevos:

- `assets/js/data.js` — las viandas, los precios y las preguntas
  frecuentes, en el formato que ya usa el armador de packs.
- `assets/js/content.js` — todos los demás textos del sitio.

Las páginas HTML ya tienen marcado, con un atributo `data-content="..."`,
dónde va cada texto. `main.js` lee `content.js` en el navegador y completa
esos lugares solo. Por eso agregar una vianda nueva, o cambiar un precio,
un texto o una foto, no requiere tocar el HTML en ningún momento.

## 1. Probar el sitio en tu máquina (opcional)

```bash
npm install
npm run build
npx serve dist
```

Eso levanta el sitio ya generado en `http://localhost:3000` para revisarlo
antes de subirlo.

## 2. Subir el proyecto a GitHub

El panel de administración necesita que el sitio viva en un repositorio de
GitHub (es lo que usa Netlify para guardar los cambios que hagan desde el
panel).

```bash
cd meta-healthy-meals
git init
git add .
git commit -m "Sitio inicial"
```

Creá un repositorio nuevo en GitHub (puede ser privado) y subilo:

```bash
git remote add origin https://github.com/TU-USUARIO/meta-healthy-meals.git
git push -u origin main
```

## 3. Conectar el repositorio a Netlify

1. En Netlify: **Add new site → Import an existing project → GitHub** y
   elegí el repositorio.
2. Build command: `npm run build` (ya viene configurado en `netlify.toml`,
   Netlify lo va a detectar solo).
3. Publish directory: `dist` (también ya está en `netlify.toml`).
4. Deploy site. El primer build tarda 1-2 minutos.
5. Una vez que el sitio esté online, si el dominio final es por ejemplo
   `metahealthymeals.com.ar`, configurá ese dominio en **Site settings →
   Domain management**, y actualizá `SITE_URL` en `scripts/build.js` y
   `site_url` / `display_url` en `admin/config.yml` si cambia.

## 4. Activar el panel de administración (DecapBridge)

Esto es lo que permite editar el sitio sin GitHub ni código, sin depender de
Netlify para el login.

> **Por qué no usamos Netlify Identity + Git Gateway:** es lo que se usa en
> el sitio de Criadores del Sur, y en su momento funcionaba bien, pero
> Netlify dejó de mantener Git Gateway (aparece como *"deprecated"* en su
> propia documentación) y ya no garantiza que funcione en sitios nuevos —
> es la causa del error *"Your Git Gateway backend is not returning valid
> settings"*. En su lugar usamos **DecapBridge**, un servicio gratis hecho
> específicamente para reemplazar esa función, sin depender de Netlify.

1. Creá una cuenta gratis en [decapbridge.com](https://decapbridge.com/auth/signup).
2. **Add a site** y completá:
   - **Git provider**: GitHub
   - **Git repository**: `tu-usuario/tu-repositorio`
   - **Git access token**: un token generado en
     [github.com/settings/tokens](https://github.com/settings/tokens), con
     permiso de lectura y escritura sobre *Contents* del repositorio.
   - **Decap CMS login URL**: `https://SU-DOMINIO/admin/index.html`
   - **Auth type**: *Classic* (login con contraseña) o *PKCE* si además
     querés ofrecer "Iniciar sesión con Google/Microsoft".
3. Al crear el sitio, DecapBridge te muestra un bloque `backend:` ya armado
   con tus datos. Copialo y reemplazá las primeras líneas de
   `admin/config.yml` (las que dicen `backend:` — están comentadas y
   explicadas ahí mismo). Dejá el resto del archivo (`media_folder`,
   `collections`, etc.) tal cual está.
4. Hacé commit y push de ese cambio — Netlify vuelve a publicar el sitio
   solo.
5. En el dashboard de DecapBridge, pestaña **Manage collaborators** del
   sitio, invitá por email a quien vaya a administrar el contenido. Van a
   poder elegir su propio método de login (contraseña, Google o Microsoft)
   sin que vos tengas que hacer nada más.
6. Listo: entrá a `https://SU-DOMINIO/admin`, iniciá sesión, y vas a ver el
   panel completo.

## 5. Cómo se usa el panel

Dentro de `/admin` hay tres secciones:

- **Viandas**: una entrada por plato. Para agregar una vianda nueva:
  botón "New Vianda", completar nombre, categoría (Pollo / Carne / Wraps
  / Bowls y Woks), descripción, y los valores nutricionales para las tres
  metas (Definir, Mantener, Construir) — son los números reales que van a
  aparecer en el sitio, no una fórmula. Guardar y publicar: en 1-2
  minutos aparece en el menú.
- **Preguntas frecuentes**: agregar, editar o borrar preguntas libremente.
- **Configuración y textos**: acá están, todos separados por página:
  - *Datos generales*: WhatsApp, Instagram, dirección, horarios, zona y
    costo de envío, y los 4 precios (vianda individual, y el precio por
    vianda de cada pack).
  - *Las tres metas*: el texto de Definir, Mantener y Construir que
    aparece en las tarjetas, el menú desplegable y el encabezado de cada
    página.
  - *Página de inicio*: el carrusel (se pueden agregar, sacar o reordenar
    fotos), los 5 pasos de "¿Cómo funciona?", la sección "Elegí tu meta",
    "Nuestra filosofía gastronómica" y "¿Por qué elegir META?".
  - *Página "Quiénes somos"*, *"Regalá un Pack META"* y *"Días y zonas de
    entrega"*: todos los textos de esas páginas, incluido el link del
    mapa (ver más abajo).

Cada vez que se guarda algo en el panel, Netlify vuelve a generar el
sitio automáticamente (tarda 1-2 minutos en verse el cambio en vivo).

## 6. El mapa de zona de entrega

El mapa de `entrega.html` es un embed de **Google My Maps** (gratis, sin
necesitar una cuenta de Google Cloud ni tarjeta). Para configurarlo o
cambiar la zona dibujada:

1. Ir a [mymaps.google.com](https://www.google.com/maps/d/), crear un
   mapa nuevo y dibujar la zona de cobertura.
2. **Compartir → Insertar en mi sitio web**. Va a dar una URL del tipo
   `https://www.google.com/maps/d/embed?mid=ABCxyz...`.
3. Pegar esa URL completa en el panel, en **Configuración y textos →
   "Días y zonas de entrega" → Mapa de zona de entrega → Link de Google
   My Maps**.

Así, cambiar la zona dibujada en el futuro tampoco requiere tocar código:
se edita directo en Google My Maps y listo (la URL del embed no cambia).

## 7. Fotos

- **Logo y favicon**: ya están cargados en `src/assets/img/logo.jpg` y
  `fav.jpg`.
- **Íconos de Definir / Mantener / Construir**:
  `src/assets/img/definir.png`, `mantener.png`, `construir.png`.
- **Fotos del carrusel de inicio**: `src/assets/img/carr1.jpg`, `carr2.jpg`,
  `carr3.jpg` (o las que se carguen nuevas desde el panel, en la sección
  "Página de inicio → Carrusel del inicio").

Cualquier foto nueva que se suba **desde el panel** (por ejemplo, para
agregar una foto nueva al carrusel) se guarda sola dentro del repositorio
en `src/assets/img/uploads/` — no hace falta subirla a mano.

## 8. Números de ejemplo a revisar antes de publicar

En `content/site.json` (o desde **Configuración y textos → Datos
generales** en el panel):

- `precio_vianda_individual`, `precio_pack_7_unidad`,
  `precio_pack_14_unidad`, `precio_pack_28_unidad` — son valores de
  ejemplo, hay que confirmarlos antes de lanzar.
- Los valores nutricionales de cada vianda (en **Viandas**, dentro de
  cada plato) también son estimados — conviene revisarlos contra la
  ficha real de cada receta.
- El link del mapa (`entrega.mapa.google_my_maps_embed_url`) todavía
  apunta a un `mid=REEMPLAZAR_CON_TU_MAP_ID` de ejemplo — ver punto 6.

## Notas técnicas

- No hay ningún framework de frontend: `build.js` genera `assets/js/data.js`
  y `assets/js/content.js` con JavaScript puro (no HTML), y las 7 páginas
  HTML existentes se copian tal cual — no se regeneran desde cero en cada
  build. Esto significa que si en algún momento se quiere cambiar el
  *diseño* o la *estructura* de una sección (no el texto), eso sigue
  haciéndose editando el HTML directamente en `/src`, como hasta ahora.
- El armador de packs, el cálculo de macros y el mensaje de WhatsApp
  siguen funcionando exactamente igual que antes — lo único que cambió es
  de dónde sale la información (antes estaba escrita a mano en
  `assets/js/data.js`, ahora se genera desde `/content` en cada build).
- Cada vianda es un archivo de contenido separado
  (`content/dishes/*.json`), así que se puede agregar o borrar un plato
  sin tocar ningún otro archivo.
