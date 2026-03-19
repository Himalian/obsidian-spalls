# Justfile for Obsidian Thino (Memos) Plugin development

# 使用 env_var("HOME") 替代 ~ 以确保在双引号中也能正确展开路径
vault_path := env_var("HOME") / "Documents/Plugin Test"
plugin_id := "obsidian-memos-fork"
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
# 对所有包含路径的变量加双引号以处理空格
link:
	@mkdir -p "{{plugin_dir}}"
	@ln -sf "$(pwd)/dist/main.js" "{{plugin_dir}}/main.js"
	@ln -sf "$(pwd)/manifest.json" "{{plugin_dir}}/manifest.json"
	@ln -sf "$(pwd)/dist/styles.css" "{{plugin_dir}}/styles.css"
	@echo "Linked plugin to {{plugin_dir}}"

# Manually copy build artifacts to Obsidian plugin directory
install: build
	@mkdir -p "{{plugin_dir}}"
	@cp dist/main.js manifest.json dist/styles.css "{{plugin_dir}}"
	@echo "Installed plugin to {{plugin_dir}}"

# Clean build artifacts
clean:
	rm -rf dist
