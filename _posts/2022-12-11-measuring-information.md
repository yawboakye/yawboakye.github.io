---
layout: post
title: Why's JSON-encoded data so big?
draft: true
---

> One King, One Law, One Weight, One Measure.
>
> &mdash; Statements of Grievances

## Motivation

I want to answer the question: in a JSON API, can the `application/json` content
type be used ubiquitously if binary (and usually large) objects were encoded as
[`Buffer`][buf]s instead of `base64` strings?

The received wisdom, when it comes to sending binary data over a JSON API, is to
encode it as a `base64` string. The other wisdom is to make an exception here and
transition from the ubiquitous [`application/json`][aj] content type (or any of its
variants depending on your JSON schema) to [`application/octet-stream`][aos] or
[`multipart/form-data`][mfd]. In fact, some prominent APIs, when they allow
uploading files at all, avoid the whole content type substitution business and
stick to `multipart/form-data`[^curious-stripe].

The reason for abandoning `application/json` when binary objects are involved is
a practical one: [JSON][] appears to be a text-based data interchange format,
supporting extremely simple set of terminal data types: string, number, boolean,
null.  Thus, in an API where JSON is the data interchange format, to upload that
new profile picture requires converting the binary JPEG file into text. There
are a few [binary-to-text][] encoding schemes for this purpose. `base64` seems
to be the most popular. Now, binary-to-text conversion is fraught with errors,
and the `base64` scheme itself has its own unique challenges, but what seems to
drive API developers away is the sheer increase in data size. The fine folks at
[MDN][] did the math and concluded that the increase is north of [33% of
original size][b33]. Quite substantial! Makes sense, then, that the binary
format is preserved and the content type set to `multipart/form-data` or
`application/octet-stream`.

Now, given that `Buffer` exists, and has [a JSON representation][buftoj], I
wonder if we could preserve both the binary format (and, more importantly, its
true size) **and** preserve our `application/json` content type as well. This is
what I investigate below. But first, something about this `Buffer` thing.

## The `Buffer` type

`Buffer` may perhaps be the first and only native Node facility for accessing
and manipulating raw bytes. If I'm wrong over here, please send corrections my
way, thanks! Most programming languages have some facility for holding and
manipulating raw bytes (e.g. Go's [`bytes`][gobytes] package). `Buffer`
introduces similar capabilities to Node-land. There's a detailed blog post on
why and how to use `Buffer` by the Node folks. Check it out [here][whybuf], I'll
wait.

## Playing with `Buffer`s

Lately (since ~7 months) I've been writing quite a lot of TypeScript for a
custom software application (to be used by a few friends and family).
We&mdash;because there's two of us working on it&mdash;decided on the
[Node.js&reg;][node] mainly due to TypeScript's powerful type system that is
arguably unmatched in other high-level application programming languages (with
the exception of Rust maybe).  Personally, I'm daily excited by the ability to
model critical system invariants in the type system alone, so that they are
checked statically, assuaging any and all runtime sacrifices made to the
validation gods. Where my inner Descartes [won't let me trust the type system
completely][cot], I've thrown in a few assertions. I hear they're inexpensive in
Node&mdash;I haven't confirmed.

So I've been playing with the `Buffer` type. And although I have no immediate
need to send or receive binary data, I wanted to find out how `Buffer`'s JSON
representation fared against current methods, i.e. actual binary transmission (e.g. as
`application/octet-stream`) and the makeshift base64 string that ensures
ubiquity of `application/json` content type. JSON-ified buffer could fly under
the `application/json` banner as well.

I'm curious whether it could solve the binary file transfer problem in a
more elegant way. Elegant in the sense that (1) we don't have to switch content
type to `application/octet-stream` or `multipart/form-data`, and (2) we don't
introduce a percentage increase in the size of the data.

To that end, I want to take `Buffer` for a spin. Below, I have a richly colorful
image of a gorgeous Ghanaian lady from the [2022 FIFA Men's World Cup
competition][wc2022] (photo taken from [Twitter](https://twitter.com)). I will
send it to a tiny file upload server. I'll try to send in various forms, as:

  1.  binary, w/ `application/octet-stream` content type,
  2.  `base64`, w/ `application/json` content type,
  3.  `Buffer` JSON, w/ `application/json` content type,

![Beautifully painted Ghanaian woman at FIFA World Cup 2022](/assets/gh-woman_200x250.jpeg)

, I'll be interested in how payload size will be measured. The payload
size is communicated to the server via the `Content-Length` header value. Here's
the image's metadata according to [`stat`][stat]:

{% highlight plain %}
File: gh-woman_200x250.jpeg
Size: 29362             Blocks: 64         IO Block: 4096   regular file
Device: fd01h/64769d    Inode: 11272883    Links: 1
Access: (0664/-rw-rw-r--)  Uid: ( 1000/  yiadom)   Gid: ( 1000/  yiadom)
Access: 2022-12-11 20:05:47.947233141 +0000
Modify: 2022-12-11 20:05:47.815232232 +0000
Change: 2022-12-11 20:05:47.815232232 +0000
 Birth: 2022-12-11 20:05:47.815232232 +0000
{% endhighlight %}

I've thrown together a rickety [HTTP server][httpserver] to receive the payload
and write the contents to a file (in the `tempdir` that way I don't have to
remember to cleanup after the experiment is done&mdash;my operating system will
do that for me).

And here's my even ricketier [HTTP client][httpclient] for sending the file in
the various formats. To perform your own experiment, feel free to download both,
replace `imagePath` with path to an image (or any binary at all) on your system,
run the server via `node server.js` and the client via `node client.js`. What
follows is a description of my observation.

## Observation
TL;DR -- Encoding the buffer as JSON performed the worst of the three. In my
particular experiment, `base64` encoding increased the size of the transfer data
by 33% (as predicted) from 29.4kB to 39.2kB. Converting the buffer to JSON

### Binary, `application/octet-stream` content type
The request received on the server had a `content-length` value exactly equal to
the size of the image on disk: 29.4 kB (29,362 bytes) uncompressed.

### Base64, `text/plain` content type
### Buffer JSON, `application/json` content type

[^curious-stripe]: Curiously, [Stripe's API][sa] prefers the `application/x-www-form-urlencoded` content type for most incoming requests but sets `application/json` on outgoing responses. For file uploads, it prefers `multipart/form-data`. During a request/response conversation, one won't be wrong to expect a symmetry of content types, but alas. There's no added debt for the API user because (1) the supported content types are fairly old and well-supported in almost all programming languages and web application frameworks, and (2) Stripe provides SDKs for popular programming languages.

[aj]: https://www.rfc-editor.org/rfc/rfc4627
[mfd]: https://www.rfc-editor.org/rfc/rfc2388
[aos]: https://www.rfc-editor.org/rfc/rfc2046
[sa]: https://stripe.com/docs/api
[buf]: https://nodejs.org/api/buffer.html
[binary-to-text]: https://en.wikipedia.org/wiki/Binary-to-text_encoding
[JSON]: https://www.json.org/json-en.html
[MDN]: https://developer.mozilla.org/en-US/docs/Glossary/Base64#encoded_size_increase
[b33]: https://developer.mozilla.org/en-US/docs/Glossary/Base64#encoded_size_increase
[uint8]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
[gobytes]: https://pkg.go.dev/bytes
[whybuf]: https://nodejs.org/en/knowledge/advanced/buffers/how-to-use-buffers/#why-buffers
[wc2022]: https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/qatar2022
[node]: https://nodejs.org/en/
[cot]: https://plato.stanford.edu/entries/descartes-epistemology/#PerfKnowBeinAwak
[buftoj]: https://nodejs.org/api/buffer.html#buftojson
[httpie]: https://httpie.io/
[stat]: https://man7.org/linux/man-pages/man2/lstat.2.html
[httpserver]: https://gist.github.com/yawboakye/a5cebad7889349971ceaa5c68c45f0a4
[httpclient]: https://gist.github.com/yawboakye/a5dd7e04f0589a89da576ffd7a4ce960
