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
$(WORKSHOPS):
	@if [ -n "$(FINAL)" ]; then touch $(WSDIR)/$@/$(FINALFLAG); \
	 else rm -f $(WSDIR)/$@/$(FINALFLAG); fi
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
