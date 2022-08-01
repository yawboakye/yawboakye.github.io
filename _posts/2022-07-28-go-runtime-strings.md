---
layout: post
title: Strings In Go's Runtime
---

## Motivation

Consider this an explainer to [Rob Pike][RobPike]'s [blog post][GoStringsBlogPost] on Go's strings.
Written with Go programmers in mind.

In the blog post, he says without much evidence that Go's strings are implemented as slices. I guess
it wasn't oversight on his part but proving that point wasn't the goal of the blog post.  Secondly
anyone who wanted to find out for themselves had Go's code at their disposal to explore. That's what
I did. And so in this post I try my best to explain how close Go's implementation of strings is to
its implementation of slices.

I don't discuss string encoding. That's not in the runtime, the thing I explore. But I discuss
common string operations that mimic slices such as length of a string (`len("go")`), concatenation
(`"go" + "lang"`), indexing (`"golang"[0]`), and slicing (`"golang"[0:2]`). To be fair, indexing and
slices are operations in their own rights, which means their availability on strings has nothing (or
very little) to do with the nature of strings. This is not entirely true, but please accept it, as
the truth will take us into the Go compiler through the underlying types of so-called basic types
and back. Secondly, I don't write this post under oath.

## The Nature of Strings

I'm yet to come across a programming language where strings have different underlying memory
structure: the contiguous slots of memory. What this means is that the bytes of a string sit next to
each other in memory, with nothing in between them. That is, if you used the famous 12-byte string,
`hello, world` in your program, and got the chance to inspect them in memory, you'd find them
sitting in the same row, each byte (or character) followed immediately by the other, with no empty
spaces or foreign bytes in between them.  As far as I know, Go doesn't deviate from this wisdom.

But this is all talk of memory, the physical stuff. When we've reached this point all things are the
same and the differences between programming languages are effectively erased. So let's back up one
level into runtimes, and here we see how the different languages go about their businesses, and this
is where we find the details of how Go implements its string data type. Luckily a significant part
of the [Go runtime][GoRuntime] is written in Go, with, God bless the authors, extensive comments
explaining both the obvious and not so obvious implementation details. The runtime's implementation
of string can be found [here on GitHub][GoRuntimeString] as at the time of writing. Let's walk about
it.

## Go's String

In the Go runtime, a string is a [`stringStruct`][GoStringStruct] type:

{% highlight go %}
type stringStruct struct {
  str unsafe.Pointer
  len int
}
{% endhighlight %}

It consists of `str`, a pointer to the block of memory where the actual bytes are located and `len`,
which is the length of the string. Since strings are immutable, these never change.

## Creating a New String

The function tasked with making new strings in the runtime is called `rawstring`. Here's how it's
implemented as at the time of writing (comments in code are mine):

{% highlight go %}
func rawstring(size int) (s string, b []byte) {
  // 1. Allocate memory block the size of the
  //    string and return a pointer to it:
  p := mallocgc(uintptr(size), nil, false)

  // 2. Make a stringStruct with the newly
  //    created pointer and the size of the string.
  stringStructOf(&s).str = p
  stringStructOf(&s).len = size

  // 3. Prepare a byte slice where the string's
  //    actual data will be stored.
  *(*slice)(unsafe.Pointer(&b)) = slice{p, size, size}
}
{% endhighlight %}

`rawstring` returns a string and a byte slice where the actual bytes of the string should be stored,
and it is this byte slice that will be used in all operations on the string. We can safely call them
data (`[]byte`) and metadata (`stringStruct`).

But this is not the end of it. And perhaps this is the only time you have access to the real
non-zeroed byte slice behind the string. In fact, the comment on `rawstring` instructs the caller to
only use the byte slice once (to write contents of the string) and then drop it. The rest of the
time, the string struct should be good enough.

Knowing this, let's look at how some common string operations are implemented. It will also make
sense to us why good old concatenation isn't a recommended way to build large strings.

## Common String Operations

### Length (`len("go")`)

Since strings are immutable, the length of a string stays constant. Even better we know it by the
time we're storing the string, and that's what we store in `stringStruct`'s `len` field. Thus,
requests for the length of a string are take the same amount of time regardless of the size of the
string. In Big-O terms, it's a constant time operation.

### Concatenation (`"go" + "lang"`)

It's a simple process. Go first determines the length of the resultant string by summing lengths of
all the strings you want to concatenate. Then it requests that size of contiguous memory block.
There's an optimization check and more importantly a safety check. The safety check ensures that the
resultant string won't have a length that exceeds Go's maximum integer value.

Then the next step of the process begins. The bytes of the individual strings are copied one after
another into the new string. That is, bytes in different locations in memory are copied into a new
location. It's unpleasant work, and should be avoided where possible. Hence the recommendation to
use [`strings.Builder`][GoStringBuilder] instead since it minimizes memory copying. It's the closest
we'll come to mutable strings.

### Indexing (`"golang"[0]`)

Go's indexing operator is written as `[index]`, where index is an integer. As at the time of writing
it was available on arrays, slices, strings, and some pointers.

What arrays, slices, and strings have a common underlying type. In physical memory terms it's a
contiguous block of memory. In Go parlance, an array. For strings this is the byte slice that was
returned by `rawstring`, this is where the string's contents are stored. And that's what we index
on. Goes without saying that the "some pointers" I mentioned above as compatible with the indexing
operator are those with array underlying type.

Note that it's the same syntax on maps but with different behavior. With maps the type of the key
determines the type of the value in between the brackets.

### Slicing (`"golang"[0:2]`)

The slice operator has the same compatibility as the index operator: operand must have an array
underlying type. Thus it works on the same set of types: arrays, slices, strings, and some pointers.

On strings there's a caveat. The full slice operator is `[low:high:capacity]`. In one go it allows
you to create a slice and set the capacity of its underlying array. But remember strings are
immutable and so there will never be a need to have an underlying array bigger that what's really
needed for the string's contents. Hence the 3-slice operator doesn't exist for strings.

## The [`strings`][GoStringsPackage] and [`strconv`][GoStrconvPackage] packages

Go provides the [`strings`][GoStringsPackage] and [`strconv`][GoStrconvPackage] packages for dealing
with strings. I already mentioned the more efficient `Builder` for building large strings.  It's
provided by the `strings` package. There's other niceties in there. Together they provide tuned
functions for string transformations, conversions, comparisons, search and replace, etc.  Check them
out before you build your own.

## Source of Confusion

### `cap(slice)` vs `cap(string)`

The built-in function `cap` returns the capacity of a slice's underlying array. Throughout the life
of a slice the underlying array's capacity is allowed to keep changing. Usually it grows to
accommodate new elements. If a string is a slice, why doesn't it respond to a `cap` inquiry?  the
question goes. The simple answer: Go strings are immutable. That is, it will never grow or shrink in
size, which in turn means that if `cap` were implemented it would be the same as `len`.

_Got comments or corrections for factual errors?  There's a [Hacker News thread for that][HN]._

[GoStringsBlogPost]: https://blog.golang.org/strings
[GoSlices]:          https://blog.golang.org/go-slices-usage-and-internals
[RobPike]:           https://ai.google/research/people/r
[GoRuntime]:         https://golang.org/pkg/runtime/
[GoRuntimeString]:   https://github.com/golang/go/blob/master/src/runtime/string.go
[GoStringStruct]:    https://github.com/golang/go/blob/b0dc54697ba34494a4d77e8d3e446070fc7b223b/src/runtime/string.go#L217
[GoSliceStruct]:     https://github.com/golang/go/blob/4363c98f62e9e315ed20b12d2ce47021fd2bf7bc/src/runtime/slice.go#L12
[GoStringBuilder]:   https://golang.org/pkg/strings/#Builder
[GoStringsPackage]:  https://golang.org/pkg/strings
[GoStrconvPackage]:  https://golang.org/pkg/strconv
[HN]:                https://news.ycombinator.com/item?id=17945312
