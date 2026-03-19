# Justfile for Obsidian Thino (Memos) Plugin development

vault_path := "~/Documents/Obsidian"
plugin_id := "obsidian-memos"
plugin_dir := vault_path / ".obsidian/plugins" / plugin_id

# Default command: build the plugin
default: build

# Run lint and fix issues
lint-fix:
	bun run lint:fix

# Build the plugin for production
build: lint-fix
	bun run build

# Run in watch mode for development
dev:
	bun run dev

# Setup symlink for development (Recommended)
# This links your project folder directly into Obsidian's plugin directory.
link:
	mkdir -p {{plugin_dir}}
	ln -sf $(pwd)/main.js {{plugin_dir}}/main.js
	ln -sf $(pwd)/manifest.json {{plugin_dir}}/manifest.json
	ln -sf $(pwd)/styles.css {{plugin_dir}}/styles.css
	echo "Linked plugin to {{plugin_dir}}"

# Manually copy build artifacts to Obsidian plugin directory
install: build
	mkdir -p {{plugin_dir}}
	cp main.js manifest.json styles.css {{plugin_dir}}
	@echo "Installed plugin to {{plugin_dir}}"

# Clean build artifacts
clean:
	rm -f main.js styles.css
