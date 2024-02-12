---
layout: post
title: A new way of thinking
---

## Motivation

[Rust] was my language of the year. You know, that thing where programmers set
out to learn a new programming language every year. Usually not to be productive
at it but to familiarize themselves with current trends in language design,
implementation, and paradigms. I had heard a lot of good stuff about [Rust] and
decided late last year to make it my 2018 language. I even attended the
all-hands of the Rust Core Team, and participated in a few discussions. To be
fair, it was in the hopes of meeting my internet friend [Yehuda Katz] in person.
He wasn't there.

A few days ago (it's November already) I began serious study using both [Philipp
Oppermann's Writing an OS in Rust] and [The Rust Programming Language Book].
You've probably heard it said that Rust is a _systems_ programming language.
Well, an operating _system_ is the ultimate system, so it's as perfect a match
as it gets. Plus both materials are available for free.

I'm only a few days in but I've been smacked by some of what I consider the best
ideas in programming I've encountered yet. I've also come to grips with gaps in
my knowledge, things I took for granted but shouldn't have, and a better
understanding of my current tools of the trade. In this post I talk about two
things: the _move_ (haven't met in any language aside Rust) and _scope_, a
concept familiar to most programming language.

## The Move

In most programming languages, code similar to what's below will compile or run.
What we want to do has been done many times and over. Assign a value to a
variable, bind one more variable to the same value but referring to it by the
previous variable, and continue to use both variables in the same scope.

{% highlight rust linenos %}
// This code accessible on the Rust playground
// at this link:
// https://play.rust-lang.org/?version=stable&mode=debug&edition=2015&gist=1640e708979885d7219b84ec45917d76

fn main() {
  let s = String::from("hello");
  let t = s;
  println!("{} is the same as {}", t, s);
}
{% endhighlight %}

In every language I've written useful software in this is perfectly valid. But
not in Rust, because, basically it fucks up memory reclamation if you're allowed
to do that.

You see, Rust is not garbage collected. That means you allocate and free memory
yourself, C-style.  If this second statement was self-evident to you then you
just got smacked by the first _falsehoods programmers believe about garbage
collection_.  Rust isn't GC-ed but you don't manually `malloc` and `free`
either. Instead heap memory is allocated and freed as you enter and leave
scopes. And this is the difference between Rust and GC-ed languages: Rust frees
unused memory immediately the scope has been exited while GC-ed languages like
Go, through a sophistication that I now no longer find necessary, reserve dead
objects to be pruned later.

That was a digression. Back to what _The Move_ is or what happened in the code
above. In simple terms, `s` moved to `t`, after all who needs two references to
the same thing? Give me a good reason why you'd have two variables point to the
same place in memory. I'll wait. This is the commonsense explanation of _The
Move_. The computer science-y explanation is: it avoid trying to free the same
memory address twice when we exit the scope. Asking that the same memory
location be cleared twice, accidentally, can have dire consequences. If
in-between the two calls the operating system offered the spot to another
process, we effectively made life difficult for this process. If Newton lived
long enough to make laws of allocating and freeing memory, he'd have quipped
that _in a given scope, number of mallocs and frees are equal but opposite_. In
the code above there's only one allocation and it's on line 6. Line 7 doesn't
allocate. So there can be only one freedom at the end of the scope. Thus both
`s` and `t` can't survive to the end of the scope.

The book has more details on this behavior, and which types it applies to. It's
[here][RustMAlloc], with more details about the `Copy` trait, `clone`-ing, and a
lesson on how to explain potentially incendiary concepts.

## Scope

Scope can be an elusive concept, but only if you let it be. You can get away
with thinking of it as the stuff in between the curly braces (in programming
languages with curly braces). In Python it's defined by the indentation, in Ruby
a mix of things. Let's stick with the curly braces for now.  Everything in the
opening (`{`) and closing (`}`) braces are in the same scope, including, wait
for it, other scopes. It could be scopes all the way down—it depends on how you
like your sugar-free coke, really. For example, here's an inception of scopes:

{% highlight rust linenos %}
fn main() {
  // parent scope
  let s = String::from("hello");
  // len, a function, defines another scope.
  // Thus the scope of `len` is a child of
  //`main`'s scope.
  let l = len(s);
  println!("{} has length of {}", s, l);
}

fn len(s: String) -> usize {
  // child scope
  s.len()
}
{% endhighlight %}

The asymmetry of life applies: child has access to everything in/on parent but
not the other way round. By all means everything we already know and expect of
scope inceptions.

That aside, the code above has been written many times over in several
languages, text editors, and color schemes. And all variations compile or work.
But not with Rust. The innocent looking code isn't really innocent: it tries to
_double spend_ a value. How? you ask. Well it sold _ownership_ of its variable
`s` to another scope (the `len` function) but tries to use it immediately after.
What?  sold what? you ask again. Well, that's how scopes work.  They own, and
can bequeath ownership of their resources. Thus passing `s` to `len` is a
statement from the `main` scope to bequeath ownership of `s` to `len`.
Henceforth `len` owns `s`. Which means that `main` has lost every right to use
it (and so shouldn't try to use it). It also means that immediately the scope of
`len` is over, the memory occupied by `s` is freed. I wasn't expecting this.
Born and bred on the jarring principles of _pass by value_ and _pass by
reference_, Rust's _ownership_ is a breath of fresh air.  Once a variable is
passed to another scope, the parent scope has lost ownership and can't use it
again. I don't even want to think in terms of variables any more. I want to
think of everything as a resource. This is probably me taking it too far but
that's what happens when you're hit by a revelation. It changes a lot of things
for you at the same time.

Any workarounds? I'd love to still use `s` after finding its length. No, no
workaround needed. We could, instead of bequeathing ownership, lease it to
`len`. How? `len` could be defined as a function that doesn't take ownership of
its arguments but rather requests a lease valid for the duration of its scope.
Here's how the new `len` looks like (together with `main`):

{% highlight rust linenos %}
fn main() {
  let s = String::from("hello");
  let l = len(&s);
  println!("{} has length of {}", s, l);
}

// The New & Improved `len`. Instead of taking
// ownership of its arguments, it requests a
// lease (aka a reference) and works with that.
fn len(s: &str) -> usize { s.len() }
{% endhighlight %}

With this change, the heap memory used by `s` won't be reclaimed when `len`'s
scope is over. In fact, in the current implementation there's no allocation so
there will be zero freeing. The allocation was in `main` and so the deallocation
or freeing or reclamation will happen there, mainly because it didn't bequeath
ownership of `s` to anyone.

## Conclusion

These concepts were pretty interesting to think about and use. And once you get
a hang of it the entire field of garbage collection, which the best minds of our
generation continue to tinker to some desired perfection, begin to look like
wasted effort. But I'd like to think otherwise and hope that there's a
significant benefit to garbage collection (over immediately freeing memory) that
I just don't know yet.

That said I've learnt a few things and as I continue to write and maintain
programs in GC-ed languages I'll see what lessons from Rust I could apply there.

The biggest takeaway is that I'll still do my interviews in Python.

Enjoy!

_Got comments or corrections for factual errors?  There's a [Hacker News thread for that][NewHN]_.

[Rust]: https://rust-lang.org/en-US/
[Yehuda Katz]: https://twitter.com/wycats
[Philipp Oppermann's Writing an OS in Rust]: https://os.phil-opp.com/
[The Rust Programming Language Book]: https://doc.rust-lang.org/stable/book/2018-edition/
[RustMAlloc]: https://doc.rust-lang.org/book/2018-edition/ch04-01-what-is-ownership.html#memory-and-allocation
[NewHN]: https://news.ycombinator.com/item?id=18379455
