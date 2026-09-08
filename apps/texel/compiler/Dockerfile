# Imagen del servicio de compilación: TeX Live + Node en el mismo contenedor.
#
# Se parte de texlive:latest-medium en vez de -full porque full pesa ~5 GB y
# Artifact Registry solo regala 0,5 GB. Medium trae latexmk, xetex y biber; lo
# que le falta al proyecto se instala explícitamente abajo.
FROM texlive/texlive:latest-medium

# ── Node 22 ──────────────────────────────────────────────────────────────────
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Paquetes de LaTeX que usa el proyecto (ver latex/tex/common/preamble.tex) ─
# Los espejos van uno a uno y **no** por `mirror.ctan.org`: ese reparte cada
# petición entre espejos distintos, así que `update --self` puede acertar con uno
# bueno y el `install` de después caer en uno roto y tumbar el build
# («TLPDB::from_file could not get texlive.tlpdb»). Con `--repository` explícito,
# toda la instalación sale del mismo sitio, y si ese sitio falla se prueba el
# siguiente en vez de dejar el despliegue a suertes.
#
# `update --self` no está: contra un tlnet al día no hace nada («no self-updates
# for tlmgr available») y solo añadía una llamada de red que podía fallar.
RUN set -eu; \
    ok=0; \
    for repo in \
      https://mirrors.rit.edu/CTAN/systems/texlive/tlnet \
      https://mirror.las.iastate.edu/tex-archive/systems/texlive/tlnet \
      https://mirrors.mit.edu/CTAN/systems/texlive/tlnet \
      https://ctan.math.illinois.edu/systems/texlive/tlnet \
      https://ftp.tu-chemnitz.de/pub/tex/systems/texlive/tlnet ; do \
      echo "▸ espejo: $repo"; \
      if tlmgr --repository "$repo" install \
        latexmk biber biblatex csquotes \
        fontspec unicode-math libertinus-fonts libertinus-otf \
        babel-spanish hyphen-spanish \
        tcolorbox enumitem environ xstring xurl \
        fancyhdr lastpage titlesec geometry microtype \
        cleveref mathtools booktabs multirow \
        pgf standalone tikzfill pdfcol \
        tools psnfss listings \
        adjustbox collectbox ifoddpage varwidth \
        `# longtable y tabularx viven en 'tools'; \ding (pifont) en 'psnfss'` \
        `# listings: bloques de código del taller 2 en adelante` \
        `# adjustbox (+collectbox, ifoddpage, varwidth): \adjincludegraphics es` \
        `# lo que entiende el trim relativo del recorte del editor visual` \
      ; then ok=1; break; fi; \
      echo "  falló; se prueba el siguiente" >&2; \
    done; \
    [ "$ok" = 1 ]; \
    tlmgr path add; \
    rm -rf /usr/local/texlive/*/texmf-var/web2c/*.log

# ── Servicio ─────────────────────────────────────────────────────────────────
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src

# Compilar como root sería regalarle la máquina a cualquier .tex subido.
RUN useradd --create-home --uid 10001 texel && chown -R texel:texel /app
USER texel

ENV NODE_ENV=production \
    PORT=8080 \
    HOME=/home/texel

EXPOSE 8080
CMD ["node", "--experimental-strip-types", "src/server.ts"]
