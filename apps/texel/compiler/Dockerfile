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
RUN tlmgr update --self \
 && tlmgr install \
      latexmk biber biblatex csquotes \
      fontspec unicode-math libertinus-fonts libertinus-otf \
      babel-spanish hyphen-spanish \
      tcolorbox enumitem environ xstring xurl pifont \
      fancyhdr lastpage titlesec geometry microtype \
      cleveref mathtools booktabs tabularx longtable multirow \
      pgf standalone \
 && tlmgr path add \
 && rm -rf /usr/local/texlive/*/texmf-var/web2c/*.log

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
