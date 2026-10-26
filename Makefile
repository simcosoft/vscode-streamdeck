PLUGIN_UUID := com.nicollasr.streamdeckvsc.mac
BUILD_DIR := build/$(PLUGIN_UUID).sdPlugin
SD_PLUGINS_DIR := $(HOME)/Library/Application Support/com.elgato.StreamDeck/Plugins

.DEFAULT_GOAL := build

.PHONY: help build watch test pack install clean

help: ## Показать список команд
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN { FS = ":.*?## " } { printf "  make %-8s %s\n", $$1, $$2 }'

build: ## Собрать плагин в build/
	npm run build

watch: ## Пересборка при изменениях + перезапуск плагина в Stream Deck
	npm run watch

test: ## Сборка + e2e-проверка протокола
	npm test

pack: ## Собрать установщик .streamDeckPlugin
	npm run pack

install: build ## Собрать и скопировать плагин в каталог плагинов Stream Deck
	rm -rf "$(SD_PLUGINS_DIR)/$(PLUGIN_UUID).sdPlugin"
	cp -R "$(BUILD_DIR)" "$(SD_PLUGINS_DIR)/"

clean: ## Удалить артефакты сборки (build/, *.streamDeckPlugin)
	rm -rf build
	rm -f *.streamDeckPlugin
