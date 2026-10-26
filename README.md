# Stream Deck для Visual Studio Code — плагин на Node.js/TypeScript

Порт плагина Stream Deck с C#/.NET на Node.js/TypeScript с использованием официального Elgato Stream Deck SDK (`@elgato/streamdeck`). Полностью совместим с существующим расширением VS Code [Stream Deck for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=nicollasr.vscode-streamdeck) — протокол обмена не изменён.

Целевая платформа: **macOS на Apple Silicon (ARM64)**, Stream Deck 7.1+.

## Действия

| Действие | UUID | Настройки |
|---|---|---|
| Execute Command | `com.nicollasr.streamdeckvsc.executecommand` | `command`, `arguments` (JSON-строка) |
| Execute Terminal Command | `com.nicollasr.streamdeckvsc.executeterminalcommand` | `command` |
| Insert Snippet | `com.nicollasr.streamdeckvsc.insertsnippet` | `name` |
| Change Language | `com.nicollasr.streamdeckvsc.changelanguage` | `languageId` |
| Create Terminal | `com.nicollasr.streamdeckvsc.createterminal` | `name`, `preserveFocus`, `shellPath`, `shellArgs`, `workingDirectory` |
| Open Folder | `com.nicollasr.streamdeckvsc.openfolder` | `path`, `newWindow` |

## Структура

```
├── com.nicollasr.streamdeckvsc.mac.sdPlugin/   # исходники плагина (ресурсы)
│   ├── Images/                                 # иконки (без изменений)
│   ├── PropertyInspector/                      # UI настроек (без изменений)
│   ├── manifest.json
│   └── settings.ini                            # опционально
├── build/
│   └── com.nicollasr.streamdeckvsc.mac.sdPlugin/   # готовый плагин (генерируется)
│       └── bin/plugin.js                           # собранный бандл
├── src/
│   ├── plugin.ts                               # вход: settings.ini, сервер, регистрация actions
│   ├── actions/                                # 6 действий + базовый KeyAction
│   ├── server/                                 # WebSocket-сервер для расширений VS Code
│   ├── messages.ts                             # DTO и конверт протокола
│   └── configuration.ts                        # settings.ini
└── test/e2e.mjs                                # e2e-тест протокола (mock SD + mock расширение)
```

## Требования

- Node.js 24+ (для сборки), Stream Deck 7.1+ (встроенный Node исполняет плагин).
- Расширение VS Code `nicollasr.vscode-streamdeck` — без изменений.

## Сборка и проверка

```sh
npm install     # воспроизводимо по package-lock.json
npm run build   # TypeScript → build/…sdPlugin (Rollup, CJS) + копирование ресурсов
npm test        # сборка + e2e-проверка протокола против mock-клиентов
npm run pack    # com.nicollasr.streamdeckvsc.mac.streamDeckPlugin (установщик)
```

Те же команды доступны через [Makefile](Makefile): `make build` (цель по умолчанию), `make watch`, `make test`, `make pack`, `make install` (сборка + копирование в каталог плагинов Stream Deck), `make clean`. Список с описаниями: `make help`.

e2e-тест поднимает сервер сообщений на отдельном порту 45719 (через временный `settings.ini` в `build/…sdPlugin`, удаляется после прогона), поэтому не конфликтует с установленным и запущенным в Stream Deck плагином, который слушает порт 48969.

Релиз на GitHub публикуется автоматически: при пуше тега `v*` (версия должна совпадать с `package.json`) GitHub Actions собирает проект, прогоняет e2e-тест и прикладывает готовый `.streamDeckPlugin` к Release.

## Установка на macOS (Apple Silicon)

Вариант А — готовый установщик с GitHub (без сборки):
1. Скачать `com.nicollasr.streamdeckvsc.mac.streamDeckPlugin` со страницы [Releases](../../releases).
2. Открыть файл двойным кликом → Stream Deck предложит установить.

Вариант Б — собрать установщик самостоятельно:
1. `npm run pack`
2. Открыть `com.nicollasr.streamdeckvsc.mac.streamDeckPlugin` двойным кликом → Stream Deck предложит установить.

Вариант В — вручную (для разработки), `make install` выполняет шаги 1–2 разом:
1. `npm run build`
2. Скопировать каталог в плагины Stream Deck:
   ```sh
   rm -rf ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/com.nicollasr.streamdeckvsc.mac.sdPlugin
   cp -R build/com.nicollasr.streamdeckvsc.mac.sdPlugin ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/
   ```
3. Перезапустить приложение Stream Deck.

Разработка с hot-reload: `npm run watch` (пересобирает и перезапускает плагин).

## Настройки (опционально)

`settings.ini` в корне `.sdPlugin` (значения по умолчанию сохранены):

```ini
[general]
host=127.0.0.1
port=48969
```

При смене порта не забудьте синхронно изменить `streamdeck.serverHost`/`streamdeck.serverPort` в настройках VS Code.

## Чек-лист ручной проверки на устройстве

Для каждого действия: назначить клавишу, заполнить настройки в Property Inspector, убедиться, что статус-бар VS Code показывает `Deck | Connected | Active` (клик по статус-бару активирует сессию), нажать клавишу.

1. **Execute Command**: `workbench.action.files.save` → файл сохраняется; команда с аргументами JSON.
2. **Execute Terminal Command**: `ls` → команда выполняется в активном терминале.
3. **Insert Snippet**: имя существующего сниппета → сниппет вставлен в редактор.
4. **Change Language**: `markdown` → язык документа изменён.
5. **Create Terminal**: с `name`/`workingDirectory` → создан терминал; `preserveFocus` сохраняет фокус.
6. **Open Folder**: путь к папке, `newWindow` on/off → папка открыта.
7. **Несколько окон**: открыть два окна VS Code → команды уходят только активному окну; переключение фокуса меняет активную сессию.
8. **Переподключение**: перезапустить VS Code → расширение переподключается (~5 с), плагин продолжает работать.
