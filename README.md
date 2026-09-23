# Tatiana's wish list

Одностраничный вишлист ко дню рождения. Python-скрипт `build.py` собирает статический сайт из `data/*.json`, GitHub Actions публикует его на GitHub Pages. Брони хранятся в Firebase Firestore, поэтому их видят все гости.

## Структура

```
data/gifts.json          список подарков
data/site.json           заголовок, подзаголовок, ключи Firebase
static/images/           картинки подарков
static/styles.css        стили
static/app.js            логика бронирования (браузер)
templates/index.html.j2  шаблон страницы (Jinja2)
build.py                 сборка в dist/
firestore.rules          правила безопасности Firestore
```

## Локальный запуск

```bash
pip install -r requirements.txt
python build.py --serve
```

Откройте http://127.0.0.1:8000. Пока Firebase не настроен, сайт работает в демо-режиме, и брони хранятся только в текущем браузере.

## Как добавить подарок

Положите картинку в `static/images/` и добавьте запись в `data/gifts.json`:

```json
{
  "id": "unique-id",
  "title": "Название",
  "description": "Описание",
  "image": "picture.jpg",
  "meme": "подпись-мем поверх картинки",
  "price": "≈ 1 000 ₽",
  "link": "https://..."
}
```

Обязательные поля: `id`, `title`, `description`, `image`. Поля `meme`, `price` и `link` необязательные. Фразы бегущей строки задаются в `data/site.json`, в поле `marquee`. Вместо имени файла в `image` можно указать ссылку `https://...`. Не меняйте `id` у уже забронированного подарка: бронь привязана именно к нему.

## Настройка Firebase (один раз)

1. На https://console.firebase.google.com создайте проект.
2. Откройте **Build → Authentication → Sign-in method** и включите **Anonymous**.
3. Откройте **Build → Firestore Database**, создайте базу, затем на вкладке **Rules** вставьте содержимое `firestore.rules` и нажмите Publish.
4. В **Project settings → General → Your apps** добавьте Web-приложение и скопируйте `apiKey`, `authDomain`, `projectId`, `appId` в `data/site.json`. Эти ключи публичные, их можно коммитить.
5. В **Authentication → Settings → Authorized domains** добавьте `<username>.github.io`.

Отменить бронь может только тот, кто её поставил: браузер получает анонимный идентификатор, и правила Firestore это проверяют. Если гость очистит данные браузера или откроет сайт с другого устройства, отменить свою бронь он уже не сможет. Удалить её можно вручную в консоли Firestore, коллекция `bookings`.

## Публикация на GitHub Pages

1. В репозитории откройте **Settings → Pages → Source** и выберите **GitHub Actions**.
2. В **Settings → Environments → github-pages → Deployment branches and tags** разрешите ветку `wish_list`.
3. Сделайте push в ветку `wish_list`. Workflow `.github/workflows/pages.yml` соберёт и опубликует сайт по адресу `https://<username>.github.io/<repo>/`.
