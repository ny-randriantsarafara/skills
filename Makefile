# llm-agnostic skills
#
# Usage:
#   make bootstrap                    # install skillctl deps
#   make validate                     # validate canonical skills + adapter manifests
#   make build TOOL=all               # generate adapters
#   make matrix                       # generate docs/compatibility-matrix.md
#   make install TOOL=claude DEST=... # install adapters
#   make sync TOOL=all DEST=...       # build + install + matrix
#   make doctor                       # check required binaries

TOOL ?= all
DEST ?=

.PHONY: bootstrap validate build matrix install sync doctor list clean

bootstrap:
	@cd tools/skillctl && npm install --no-audit --no-fund

validate:
	@cd tools/skillctl && node src/cli.mjs validate

build:
	@cd tools/skillctl && node src/cli.mjs build --tool $(TOOL)

matrix:
	@cd tools/skillctl && node src/cli.mjs matrix

install:
	@cd tools/skillctl && node src/cli.mjs install --tool $(TOOL) $(if $(DEST),--dest $(DEST),)

sync:
	@cd tools/skillctl && node src/cli.mjs sync --tool $(TOOL) $(if $(DEST),--dest $(DEST),)

doctor:
	@cd tools/skillctl && node src/cli.mjs doctor

list:
	@find core/skills -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort

clean:
	@echo "No destructive cleanup defined."
