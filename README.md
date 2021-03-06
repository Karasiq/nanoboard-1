# nanoboard
nanoboard client + sources in a single zip: https://github.com/nanoboard/nanoboard/releases

Внимание! Статья устарела и нуждается в обновлении

За время существования статьи спецификации поменялись и дополнились такими элементами как капча и Proof Of Work...
## Причина создания

 - Модераторский произвол
 - Мечта о неубиваемой борде

## Ценности Наноборды

 - простота формата нанопостов: хэш + текст сообщения = хэш (на который могут ссылаться другие нанопосты)
 - отсутствие владельца, прав, уровней доступа, невозможность централизованной модерации или отключения наноборды
 - отсутствие стандартизированного протокола распространения, в самой простой форме нанопост можно скопировать и вставить как текст
 - паразитирование на существующих ресурсах в интернете и скрытом интернете вместо организации p2p-соединений и/или серверов (низкий уровень детектирования + эксплуатация чужих мощностей)
 - поощряется помощь участникам и наноборде в виде ретрансляции чужих нанопостов (кроме огромных)
 - клиенты для просмотра собирают все нанопосты воедино и формируют цепочки - так сохраняется логическая связь между нанопостами и отпадает необходимость во временных метках (подверженных фальсификации)
 - клиенты для просмотра должны давать участнику возможность легко фильтровать нежелательный мусор, чтобы не видеть его и не распространять
 - клиенты для просмотра облегчают участнику распространение своих и чужих нанопостов (кроме мусора)
 - клиенты для просмотра ограничивают распространение слишком огромных чужих нанопостов, чтобы пресекать злоупотребление "трафиком" наноборды

## Спецификации

Каждый нанопост обязательно ссылается на другой нанопост поредством хэш-кода.

Хэш код 16-байтовый и выглядит как 32-символьный кусочек текста в шестандцатиричном текстовом виде.

Рассмотрим пример на JavaScript.

Нам понадобится SHA-256, взять можно например отсюда: http://www.movable-type.co.uk/scripts/sha256.html

или отсюда: https://username1565.github.io/sha256/sha256_utf8.html

```
var post = "00000000000000000000000000000000{Welcome to Nanoboard}"
var hash = Sha256.hash(post).substring(0,32) // берём хэш f682830a470200d738d32c69e6c2b8a43b44435f48ba000cfb5203b22e9bf026 в hex и отбрасываем всё кроме первых 32 символов
console.log(hash) // результат: f682830a470200d738d32c69e6c2b8a4
```
Хэш считается с байтов utf-8 кодировки. В nboard этот пост и его хэш используются как "корневые" но это не обязательно.

Теперь попробуем "ответить" на корневой пост.

```
var answer = hash + "Проверка ответа."
console.log(answer) // результат: f682830a470200d738d32c69e6c2b8a4Проверка ответа.
```

Ответим снова.

```
function getHash(content) { return Sha256.hash(content).substring(0,32); }
var answer2 = getHash(answer) + "Второй уровень."
console.log(answer2) // результат: 77bb9e5d1a64facc551210862e2c6536Второй уровень.
```
Вот так выглядят нанопосты, естественно, внутри можно ставить переносы строк и любые utf-8 символы.

Теперь осталось только распространить их. По хэшам все связывается в цепочки. Сложно сказать что является тредом среди нанопостов.

Определенно если на нанопост существует несколько ответов то с него можно начинать просмотр "треда".

Начать разворачивание можно с любого уровня, это уже на плечах реализаций просмотрщиков Наноборды.

В nboard можно разворачивать любые нанопосты кроме корневого, а можно просто просматривать только сам нанопост

и его ответы (следующий уровень).
_______
Наноборда берет начало с Анонимных Имидж Борд, Имидж означает наличие картинок (image).

Хотя существуют чисто текстовые борды, наноборда такой не является, потому как внутрь можно вставлять base64-изображения.

В nboard это реализовано так: если в нанопосте встречается конструкция вида [img=.....]

(где вместо точек - base64 строчка), то всё это дело превращается в изображение.

Кроме того nboard поддерживает разметку:

**[b]жирный[/b]**, *[i]курсив[/i]*, ~~[s]перечеркнутый[/s]~~, [sp]спойлер[/sp], [u]подчёркнутый[/u], [g]зелёный[/g].

Также, возможно распространять в виде base64 - любые файлы (размером до 65535 байт).

В основном, это zip-архивы, [но могут быть и любые другие файлы](https://github.com/nanoboard/nanoboard/issues/6).

Файлы, могут быть прекриплены, как JPEG-картинка, без сжатия, тогда, в нанопосте, используется:

 - либо старая конструкция [xmg=.....], где вместо точек - base64 несжатого файла,

   В этом случае, когда скрипт наноборды находит тег xmg, он автоматически добавляет ссылку на закачку zip-архива,

   превращая её в dataURL.

 - либо же используется bb-код file, с именем и типом файла - как у карасика.
 
   Тогда, при парсинге, имя файла попадает в ссылку, в атрибут download, а тип файла - в dataURL,
   
   и бинарный файл - можно закачать, по ссылке.

## PNG-контейнеры

На АИБ обычно можно свободно постить PNG-картинки. А в PNG-картинку можно вшить данные.

В nboard используется подход (и, собственно, код) из этой статьи: http://blog.andersen.im/2014/11/hiding-your-bits-in-the-bytes/ 

Вкратце суть в том что информация размещается в нижних битах компонентов R, G и B каждого пикселя

и это совершенно незаметно на глаз.

Разница между 24битным цветом и 21битным цветом с дизерингом (информациионный шум), по сути - минимальна.

Размер картинки после этого обычно увеличивается но не разительно.

Информация хранится именно в пикселях, что позволяет скопировать картинку в буфер обмена,

вставить в графический редактор, сохранить, скажем, в BMP, а потом пересохранить в PNG - вшитая информация не пропадёт.

Итак nboard берет некоторое количество свежих (по дате поступления на компьютер пользователя) постов,

а также некоторое количество случайно выбранных постов за всё время.

При этом избегаются скрытые пользователем посты, а крупные посты отправляются только если являются свежими.

В [наноборде карасика](https://github.com/Karasiq/nanoboard) также имеется кнопка "В очередь" и "Из очереди",

позволяющая тонко настроить список очереди нанопостов, для упаковки их оттуда - в контейнер.

Случайные посты, можно также отключить там.
_______
Но это там...

Здесь же, упаковка массива постов происходит следующим образом:

```
    public static byte[] Pack(NanoPost[] posts)
    {
        List<byte> bytes = new List<byte>();
        // количество постов (от 000000 до ffffff) (строчка в utf-8 байтах):
        bytes.AddRange(Encoding.UTF8.GetBytes(posts.Length.ToString("x6"))); 

        foreach (var p in posts)
        {
            // количество символов (не байтов!) в нанопосте (включая родительский хэш):
            var len = p.SerializedString().Length; 
            // тот же формат: от 000000 до ffffff (строчка в utf-8 байтах):
            bytes.AddRange(Encoding.UTF8.GetBytes(len.ToString("x6"))); 
        }

        foreach (var p in posts)
        {
            // utf-8 байты каждого поста по очереди без разделителей:
            bytes.AddRange(p.SerializedBytes()); 
        }

        // сжимаем результат gzip-ом
        return GZipUtil.Compress(bytes.ToArray());
    }
```

Перед упаковкой в контейнер (после сжатия gzip-ом) применяется шифрование salsa20 по некоторому ключу.

Для Наноборды пока есть один общий ключ, но дальше можно отделяться в отдельные зашифрованные Наноборды

(что нежелательно но иногда может быть необходимо):

```
        // Параметры инициализации salsa20 для заданного ключа (key):
        byte[] initKey = SHA256.Create().ComputeHash(Encoding.UTF8.GetBytes(key));
        byte[] initVec = SHA256.Create().ComputeHash(Encoding.UTF8.GetBytes(key).Reverse().ToArray());
        initKey = initKey.Crop(32);
        initVec = initVec.Crop(8);
```
_______
На этом пока что всё.

Напомню, что PNG-контейнеры - [не единственный возможный способ](https://username1565.github.io/js-jpeg-steg/) обмена нанопостами

и различные АИБ - [не единственное возможное место](https://github.com/username1565/nanoboard/issues/2) для паразитирования.

Одна из экстремальных идей - запихивание нанопостов в QR-коды и разбрасывание/расклеивание этих QR-кодов в местах,

где их будет удобно считывать (и, собственно, наклеивать/разбрасывать).

Так Наноборда сможет продолжить существование даже без Интернета, например, в метро.

Разумеется, вариант почти фантастический, но пример демонстрирует гибкость и ту самую неубиваемость Наноборды.

Ведь используя один лишь смартфон, с приложением в виде сканера qr-кодов,

даже в метро можно декодировать из qr-кода - коротенькую magnet-ссылку,

вытащить по ней - пак пикч из облачного торрента,

распарсить эти picture в бункере, на нейрокомпьютере, и залезть в нанабороду.

Алсо, может быть привинчена - IRC-координация (а это технология, она неубиваема, ага),

[Tox](https://tox.chat/download.html) (а там - [ассиметричная криптография](https://username1565.github.io/js-nacl/generate_keypair_and_crypt.html) на библиотеке [NaCl](https://username1565.github.io/js-nacl/)),

p2p (а там вообще - тотальная децентрализация пиринговых сетей же), 

и многое другое... 

## nanodb.exe-source from nanoboard-restore.zip

nanodb.exe-source from https://github.com/nanoboard/nanoboard/releases/download/0/nanoboard-restore.zip
nanoboard-restore\nanodb.exe-source
Version: Client 3.0
Language: C#

Q: How to compile nanodb.exe?
A:
1. Win+R
2. cmd, enter.
3. disk:\Path_to_.NET_Framework\MSBuild.exe /property:Configuration=Release nanodb.csproj

Q: Is nanodb.exe portable?
A: No, this working with files from restore-archive.

## Updates

See updates here: https://github.com/username1565/nanoboard/releases/

Commits: here: https://github.com/username1565/nanoboard/network
