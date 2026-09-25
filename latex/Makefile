# Makefile — talleres de CySec
#
#   make ws-01            compila build/ws-01/main.pdf (borrador: cajas TODO visibles)
#   make ws-01 FINAL=1    versión entregable (sin cajas; los pendientes quedan en el .log)
#   make all              todos los workshops/ws-*
#   make watch WS=ws-01   recompila al guardar (latexmk -pvc)
#   make new WS=ws-02     crea workshops/ws-02 a partir de workshops/_template
#   make clean            borra build/ y las marcas .final-mode

LATEXMK   := latexmk
BUILDDIR  := build
WSDIR     := workshops
FINALFLAG := .final-mode

WORKSHOPS := $(notdir $(wildcard $(WSDIR)/ws-*))

.PHONY: all watch new clean deepclean list $(WORKSHOPS)

all: $(WORKSHOPS)

# Un target por taller: `make ws-01` → workshops/ws-01/main.tex → build/ws-01/main.pdf.
# (Regla explícita y no de patrón: make ignora las reglas implícitas para targets .PHONY.)
# -cd hace que latexmk entre a la carpeta del taller, así \input{sections/...}
# resuelve relativo al taller y no a la raíz.
# Si el modo (borrador/final) CAMBIA se borra el .fdb_latexmk: \IfFileExists con
# un archivo inexistente no queda registrado en el .fls, así que latexmk no se
# entera de que .final-mode apareció y saltaría la recompilación.
$(WORKSHOPS):
	@if [ -n "$(FINAL)" ]; then \
	   if [ ! -f $(WSDIR)/$@/$(FINALFLAG) ]; then \
	     touch $(WSDIR)/$@/$(FINALFLAG); \
	     rm -f $(BUILDDIR)/$@/*.fdb_latexmk; \
	   fi; \
	 else \
	   if [ -f $(WSDIR)/$@/$(FINALFLAG) ]; then \
	     rm -f $(WSDIR)/$@/$(FINALFLAG); \
	     rm -f $(BUILDDIR)/$@/*.fdb_latexmk; \
	   fi; \
	 fi
	$(LATEXMK) -cd -outdir=../../$(BUILDDIR)/$@ $(WSDIR)/$@/main.tex
	@echo "→ $(BUILDDIR)/$@/main.pdf"

watch:
	@test -n "$(WS)" || { echo "Uso: make watch WS=ws-01"; exit 1; }
	rm -f $(WSDIR)/$(WS)/$(FINALFLAG)
	$(LATEXMK) -cd -pvc -outdir=../../$(BUILDDIR)/$(WS) $(WSDIR)/$(WS)/main.tex

new:
	@test -n "$(WS)" || { echo "Uso: make new WS=ws-02"; exit 1; }
	@test ! -d $(WSDIR)/$(WS) || { echo "$(WSDIR)/$(WS) ya existe"; exit 1; }
	cp -R $(WSDIR)/_template $(WSDIR)/$(WS)
	@echo "Creado $(WSDIR)/$(WS) — edita $(WSDIR)/$(WS)/meta.tex y compila con: make $(WS)"

list:
	@echo "Talleres: $(WORKSHOPS)"

clean:
	rm -rf $(BUILDDIR)
	rm -f $(WSDIR)/*/$(FINALFLAG)

deepclean: clean
	rm -f $(WSDIR)/*/*.aux $(WSDIR)/*/*.log $(WSDIR)/*/*.out \
	      $(WSDIR)/*/*.fls $(WSDIR)/*/*.fdb_latexmk $(WSDIR)/*/*.synctex.gz
