---
category: sententia
layout: post
title: Yes, Rust is beginner-friendly
tags: rust rust-lang beginner-friendly toprank pedagogy philosophy
draft: true
---

**TL;DR&mdash;Rust, the programming language and technology is
beginner-friendly; the official and recommended learning materials, on the other
hand, aren't. Unfortunately, a confused conflation here makes one attribute the
badness of the learning materials to the object they try to teach.**
<hr>
<p class="message">Being a retro-capture of a statement I made during the <a
style="color:black;text-decoration:underline"
href="https://join.devcongress.org">DevCongress</a> Rust Study Group's sync
session on Wednesday, Mar 22, 2023 to address a concern about the
beginner-friendliness of Rust, the object of our study. I've untied a few
knots&mdash;or so I hope&mdash;and provided more background and detail where
necessary.</p>

Among other things, Rust is notorious for being unfriendly to
beginners[^which-beginner]. Many people have struggled with its steep learning
curve and have given up before seeing any benefits (patience is a resource in
short supply, after all). Even experienced Rust programmers agree that it can be
tough to get started with the language. In fact, Rust's directors seem to agree
with this evaluation (of rough first encounter) and so they have committed quite
a lot of resources towards preparing high-quality learning materials for the
language. The official (& free) book, [The Rust Programming Language][rustbook],
for example, is arguably the best introductory material to Rust. This is the
material that the DevCongress Rust Study Group uses.

One careful look at the beginner-unfriendliness notoriety, and it becomes
obvious that one thing, and one thing alone, is to blame. You see, Rust's key
feature is memory safety. It achieves that through a largely novel memory
management technique publicly known as **ownership**[^fn-ownership]. If you're
learning Rust through the official book, you encounter it in [chapter 4][ch4].
The importance of grokking this subject matter is mildly but sternly emphasized
at the start of the chapter (bold emphasis mine):

>**Ownership is Rust’s most unique feature and has deep implications for the rest
>of the language**. It enables Rust to make memory safety guarantees without
>needing a garbage collector, so **it’s important to understand how ownership
>works.** In this chapter, we’ll talk about ownership as well as several related
>features: borrowing, slices, and how Rust lays data out in memory.

The implications are deep, indeed: at all times the Rust programmer must keep
their mind fixed on ownership since the compiler rejects programs that violate
the [laws of ownership][leges-possedendi]. Politely, but firmly. Although it
tries to provide ample help to relieve any pent-up anger, unless you made an
obviously silly mistake, the rejection, and the surprise it usually evokes, can
mean just one thing: you don't know what you're doing! The feeling could easily
be one of defeat. A feeling to be avoided by all means necessary. And so when we
(the Study Group) arrived at the first [chapter on ownership][ch4], we
determined to spare no resources to make it make sense. We even invented and
played several rounds of ownership-themed games.  Well, three weeks of
individual studies and 9 hours of group meetings later, I'm here to tell you
that we really aren't sure we have this beast under control. Worse, we're not
even sure we can ever put it under control.

## Is ownership, by nature, difficult to understand?

Our own experience, and that of many other people on the internet, seem to
discourage spending more than regulation time on trying to understand ownership.
They say that the extra time is better spent playing whack-a-mole with the
compiler, they say. You're going to play it anyways. It would seem that
experienced Rust programmers are just great at plugging an apostrophe here, an
ampersand there, and shuffling them around until voila! a permutation that
satisfies the laws of ownership. But I've watched a few videos of [Jon
Gjengset][jong] at work and this doesn't seem to be his <em>modus operandi</em>.
If anything, he appears very at home. He makes mistakes, of course, but these
are largely restricted to syntax and bad implementation. He barely confronts an
unyielding borrower checker. So what's amiss here?

___

[^which-beginner]: it's important to distinguish between the two classes of beginners: the first, is a beginner to programming overall. the second type of beginner has pre-existing programming experience. they may even be professional programmers. which means they're familiar with popular programming concepts. when rust is accused of being unfriendly to beginners, both classes are implied.

[^fn-ownership]: this is not to suggest that there's a private & different name. i'm not a computer scientist and so i'm not well-versed in the language of the field. but i'm an attentive listener, and i've heard rumors that ownership indeed has a different (formal?) name/vocabulary in academese, the language of academics.

[^brown-cs-edition]: or the interactive, quiz-based version maintained by the computer science department of brown university freely accessible at [https://rust-book.cs.brown.edu/title-page.html](https://rust-book.cs.brown.edu/title-page.html). my opinion on this noble undertaking is that it misunderstands the problem of teaching rust and expends high quality effort and time barking up the wrong tree.

[jong]: https://www.youtube.com/@jonhoo
[DevCongress]: https://devcongress.org/
[rustbook]: https://doc.rust-lang.org/
[ch4]: https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html
[leges-possedendi]: https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html#ownership-rules
[minotaurus]: https://en.wikipedia.org/wiki/Minotaur
