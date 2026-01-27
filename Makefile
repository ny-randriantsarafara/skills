# claude-skills
#
# Usage:
#   make                 # installs skills to $(DEST)
#   make DEST=...        # override destination
#
# Default destination for "personal Claude skills" (adjust if your setup differs)
DEST ?= $(HOME)/.claude/skills

.PHONY: all install list clean

all: install

list:
	@echo "Skills in repo:"; \
	ls -1 skills

install:
	@echo "Installing skills -> $(DEST)";
	@mkdir -p "$(DEST)";
	@rsync -a --delete "skills/" "$(DEST)/"
	@echo "Done. Installed:"; \
	ls -1 "$(DEST)"

clean:
	@echo "Nothing to clean.";
