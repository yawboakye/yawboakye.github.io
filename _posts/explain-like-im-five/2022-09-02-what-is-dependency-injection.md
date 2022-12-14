---
category: explain-like-im-five
layout: post
title: What is dependency injection?
tags: dependency injection solid principles software philosophy
---

> The preliminary terror, which chokes off most fifth-form boys from even
> attempting to learn how to calculate, can be abolished once for all by simply
> stating what is the meaning–in common-sense terms–of the two principal symbols
> that are used in calculating.
> 
> &mdash; Silvanus P. Thompson, [Calculus Made Easy][CME]

In my opinion, the biggest obstacle to understanding the [dependency
injection][] (DI) design pattern lies in knowing what a _dependency_ is. In
software, _dependency_ can be used to refer to quite different things, making it
harder to cleanly pin down a reliable definition. For example, entire libraries
you use within your application (those things you install with `yarn add ...`,
`gem install ...` and friends) are called dependencies too. So, are those the
dependencies we're trying to inject? Not necessarily.

If we accept a definition of _dependency_ as a certain requirement, necessary or
contingent, for a given piece of code to work, then we begin to see dependencies
at all layers of a functioning system: from the lower layers of functions (as
function parameters), through structures like classes (other/lower-level
classes), packages/modules (other packages/modules), applications (packages,
other applications), to services (applications, other services, etc) and beyond.
In my experience, at every layer, a different style of dependency injection is
necessary; the goal remains the same though: **the dependency should be ready to
used when and where necessary**.

DI is usually meaningful up to the application layer. Mainly because (1) design
patterns make the most sense at this layer and below, (2) when folks talk about
dependency injection they have this layer in mind, and (3) in a
layered/hierarchical assembly, higher units usually have little to no control
over internal organization of the lower layers they depend on
[^fn-ubiquitous_hierarchy].

### Injecting dependencies into functions
Dependency injection at the function level/layer has been variously simplified
as _function parameterization_. Or perhaps I made up this term? To parameterize
a function is to define unknown quantities as parameters instead of deriving
them within the function's body. Let me try to illustrate with two functions:
`parameterized_sum` and `non_parameterized_sum`. Both add two integers `A` and
`B`. Pay attention to how they receive `A` and `B`.

```
parameterized_sum(A, B) -> A+B

non_parameterized_sum() ->
  A = read(stdin, "A: ") as int
  B = read(stdin, "B: ") as int
  A+B
```

The difference between the two functions is quite clear: `parameterized_sum`
outsources deriving `A` and `B` to the caller. `non_parameterized_sum` instead
derives `A` and `B` itself by reading and parsing input from standard input. If
this doesn't look like a bad idea, consider that while `non_parameterized_sum`
is severely constrained (to only adding numbers that were read from `stdin`),
`parameterized_sum` has no such limitations: it really doesn't care where `A`
and `B` came from. `A` and `B` could have been derived from a random number
generator, or from a file, or from a database table row. It really doesn't
matter to `parameterized_sum`. By outsourcing the initialization of `A` and `B`,
`parameterized_sum` obtains robustness in the face of changing requirements, and
robustness in the face of changing requirements is a critical quality of
well-crafted code.

But `A` and `B` are simple, scalar dependencies. Let's examine a different
situation where the dependencies require a slightly more complex initialization.
Here's a file lookup function. It's called `find`. It retrieves a file from a
given source. At the moment the sources we support are (1) database (where file
content could be stored as a blob of data), (2) local file system, and (3) AWS
S3. Here's the code:

```
find(src, id) ->
  if src is db: database.lookup(id)
  if src is fs: filesystem.lookup(id)
  if src is s3: aws_s3.lookup(id)
```

Obviously we have dependencies on the database, the file system, and S3. At the
moment it's not clear where they came from&mdash;`find` jumps straight into
using them.  All three (and especially `database` and `aws_s3`) require slightly
complex initialization. Take the database for example. `database.lookup` works
if and only if a connection to the server has been established, and establishing
that connection usually involves building a client, dialing the server, and
running some checks/pings to confirm that the database is in a desirable state.
This is all necessary work: it has to be done.  The question is where and when
to do it.

One option is to initialize them inside `find`'s body, like so:
```
find(src, id) ->
  database := init_db_client()
  filesystem := init_fs_client()
  aws_s3 := init_aws_s3_client()

  if src is db: database.lookup(id)
  if src is fs: filesystem.lookup(id)
  if src is s3: aws_s3.lookup(id)
```

Some people strongly believe that the code above is as ugly as it gets.  Their
go-to argument is that we're only a few inches away from the entire codebase
becoming a sprawling mess of `init_db_client()`, `init_fs_client()`,
`init_aws_s3_client()` invocations, making it extremely difficult to figure out
exactly where the first database or file system or S3 client initialization
happens. The other argument is that dependencies usually form a [direct acyclic
graph][dag]. This means that it's critical that they're initialized in a
topologically sorted order. If there's more than a handful of dependencies, it
could be a painful and error-prone task for a human. But not for a computer.

Just as we did we `parameterized_sum`, we can defer the initialization concern,
for now, and define `database`, `filesystem`, and `aws_s3` as parameters, like so:
```
find(src, id, database, filesystem, aws_s3) ->
  if src is db: database.lookup(id)
  if src is fs: filesystem.lookup(id)
  if src is s3: aws_s3.lookup(id)
```

Technically we have achieved dependency injection, but at some cost.  First, we
have blown up `find`'s arity. It went from `find/2` to `find/5`. I have written
about [keeping function arity to maximum of two]({% post_url 2022-06-25-function-parameters %}).
Secondly, we haven't solved the part where the computer, not the programmer,
initializes the dependencies in a topologically sorted order. We just don't
have to do it within `find`'s body, but it has to be done somewhere and, so far
it looks like a human has to do it. But that's if we don't use a dependency
injection framework.

A dependency injection frameworks (e.g. [dagger][], [wire][], [dig][]) let you
delegate dependency initialization to the computer. Below I'll demonstrate a
hypothetical dependency injection framework, `di_framework`.

`di_framework` allows us to restore `find` to its original state where it
accepted only two parameters: `src` and `id`.  `di_framework` provides
facilities that allow us to inject `database`, `filesystem`, and `aws_s3` into
`find` at minimal cost. We do that by declaring a manifest of dependency using
the `@di_framework::inject` annotation. At runtime, `di_framework` will ensure
that `database`, `filesystem`, and `aws_s3` are properly initialized and ready
to go!

```
@di_framework::inject(
  database,
  filesystem,
  aws_s3,
)
find(src, id) ->
  if src is db: database.lookup(id)
  if src is fs: filesystem.lookup(id)
  if src is s3: aws_s3.lookup(id)
```

The manifest doesn't necessarily have to be outside the body of the function.
For programming languages without annotations, the code below is an equally
valid dependencies declaration:
```
find(src, id) ->
  di_framework::inject(
    database,
    filesystem,
    aws_s3,
  )

  if src is db: database.lookup(id)
  if src is fs: filesystem.lookup(id)
  if src is s3: aws_s3.lookup(id)
```

Hell, the annotation name needs not be `inject`[^fn-inject] either! Could be
`needs`, or `requires`. The industry, dominated by English speakers, seems to
have settled on `inject`.

And what about the initialization part? It looks like this:
```
@di_framework::provides(database)
init_db_client() ->
   params := get_params()
   client := build_client(params)
   healthcheck!
   client

@di_framework::provides(filesystem)
init_fs_client() ->
  params := get_params()
  fs := mount_fs(params)
  build_client(fs)

@di_framework::provides(aws_s3)
init_aws_s3_client() ->
   params := get_params
   client := build_client(params)
   healthcheck!
   client
```

We annotate client initialization functions with `@di_framework::provides`.
That's how `di_framework` knows which function to call for each dependency. If,
for example, we hadn't annotated any function to provide `aws_s3`, we'd be in
trouble since `di_framework` can't honor any `@di_framework::inject(aws_s3)`
command.

Typically, dependency injection frameworks can provide more than `inject` and
`provides` annotations, especially if they have runtime behavior. For example,
they can ensure that `init_db_client()`, `init_fs_client()`, and
`init_aws_s3_client()` are invoked just once. The first time they're invoked,
the resulting object is stored in a container (some sort of dependency registry,
if you will) so that satisfying a `@di_framework::inject` annotation is a cheap
registry lookup. Some dependency injection frameworks do all their work at
compile time. The net effect is that the initialization code is (1)
topologically ordered, then (2) copy-pasted into all the right places. There is
no global dependency registry hanging around during the lifetime of the
application. Something to pay attention to when choosing a dependency injection
framework: depending on your expectations, this may be undesired.

Enough said about dependency injection. As with all principles, the practice
can, and I believe should, be allowed to deviate from the theory. Thus, you
should expect to see wild varieties in implementations both of dependency
injection itself and its frameworks. Regardless, they should share a single
_animus_, and I think it's that soul that I've tried to capture here.

Vale!

[^fn-inject]: `inject` derives from the latin `inicere` with the imperative form `inice`. As a latinist, my preferred translation, and one that fits the purpose here, is throw into. See [Wiktionary](https://en.wiktionary.org/wiki/inicio#Latin) for more forms. `inject` as used in dependency injection is the imperative form of the verb. it appears that english derived the verb from the french `injecter` which has an interesting history. as it happens quite frequently in latin, verbs are backformed from supines of existing verbs. `iniectare` was backformed from `inicere`'s supine, `iniectum`, and took on a life of its own. french derived `injecter` from `iniectare`. later, english derived `to inject` from french's `injecter`.
[^fn-ubiquitous_hierarchy]: > ... a matrix on the n-level is represented on the n+1 level by its code. ...  loss of direct control over automatized processes on lower levels of the body  hierarchy is part of the price paid for differentiation and specialization. &mdash; Arthur Koestler, [ The Act of Creation](https://en.wikipedia.org/wiki/The_Act_of_Creation), chapter on The Ubiquitous Hierarchy.

[dependency injection]: https://en.wikipedia.org/wiki/Dependency_injection
[dag]: https://en.wikipedia.org/wiki/Directed_acyclic_graph
[dig]: https://pkg.go.dev/go.uber.org/dig
[dagger]: https://dagger.dev/
[wire]: https://github.com/google/wire/blob/main/docs/guide.md
[CME]: https://calculusmadeeasy.org/
