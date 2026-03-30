# Justfile for Obsidian Thino (Memos) Plugin development

vault_path := env("HOME") / "Documents/Plugin Test"
plugin_id := "obsidian-memos-fork"
plugin_dir := vault_path / ".obsidian/plugins" / plugin_id

default: build

lint-fix:
    bun run lint:fix

build: lint-fix
    bun run build

dev: link
    bun run dev

link:
    @mkdir -p "{{plugin_dir}}"
    @ln -sf "$(pwd)/main.js" "{{plugin_dir}}/main.js"
    @ln -sf "$(pwd)/manifest.json" "{{plugin_dir}}/manifest.json"
    @ln -sf "$(pwd)/styles.css" "{{plugin_dir}}/styles.css"
    @echo "Linked plugin to {{plugin_dir}}"

install: build
    @mkdir -p "{{plugin_dir}}"
    @cp main.js manifest.json styles.css "{{plugin_dir}}"
    @echo "Installed plugin to {{plugin_dir}}"

clean:
    rm -f main.js styles.css
