---
layout: post
title: Function parameters
---

## Motivation

This post is brought to you by one part frustration, one part discovery, and another part a plea to
reconsider how we create functions and APIs going forward.

## Modern Functions

A modern function, the type you see in modern high-level programming languages such as JavaScript,
Python, Ruby, Go, PHP have their origins in C: they accept input (also known as arguments) and
return an output (or maybe not).  Below is a simple Go function which accepts 2 integers as input
and returns their sum (shrouded in some mandatory Go ceremony):

{% highlight go linenos %}
package main

import "fmt"

func main () {
  total := sum(1, 2)
  fmt.Printf("1 + 2 = %d", total)
}

func sum(a, b int) int {
  return a + b
}
{% endhighlight %}

Before we get any further, some definitions.

A function's [arity] is its number of parameters.  Our sum function above has an arity of 2; written
as `sum/2` in the name-arity notation.  Even though _parameters_ and _arguments_ are used
interchangeably, a function is defined with parameters but called with arguments.  Referring, again,
to our sum function above, _a_ and _b_ are its parameters (see line 10), while the call on line 6
has _1_ and _2_ as arguments.  Parameters are constant, arguments change.  _Function_ and _method_
are also used interchangeably. In this post, I differentiate between them as such: a _method_ is a
function defined on a receiver. In imperative programming the receiver is usually an instance of a
class.

With definitions out of the way, let's address the biggest challenge of function parameters.

## Function Parameters Are Positional

What does this mean?

During a function's definition its parameters are given in a certain order. That order is a decree
to future callers. If and when they use the function they should (1) pass the necessary arguments,
but more importantly (2) in the _right_ order. This so-called _right_ order is fixed and
non-negotiable. It's in this stubborn rigidity that the problem lies. I'll illustrate.

Take for example, `exp`, a nifty Python function for exponentiation. It calculates the _e-th
exponent of a base_. `exp` is defined as follows:

{% highlight python %}
def exp(e, b):
  """
  Returns the e-th exponent of b.
  To find the 5th exponent of 2, exp
  is called as such: exp(5, 2).
  """
  return b**e
{% endhighlight %}

Does the order of the parameters make sense to you?  If your definition of exponentiation is a _base
b raised a power e_ you'd intuit that a function that does exactly that will be defined as such:

{% highlight python %}
def exp(b, e):
  """
  Returns the e-th exponent of b. That is,
  b raised to the power e. To calculate 2
  raised to the power 5, exp is called as such:
  exp(2, 5)
  """
  return b**e
{% endhighlight %}

We agree on the implementation of the function. We agree that the _base_ and _exponent_ should be
parameters so that we can use it on a variety of inputs, but we disagree on the order of the
parameters, and if your version isn't chosen then you'd have to live with the dissonance, constantly
referring to the source code or documentation to learn the order of arguments. We've made a
parameter's position important and subjective to the programmer. In my opinion, this is not good.

We're lucky here though. `exp` has an arity of two so there's a 50% chance we'll guess the order
right.  An arity of 3 reduces it to 17%. One more parameter and you can't rely on your intuition
anymore. See for yourself:

<form style="background:#333;border-radius:15px;padding:10px" id="arity-form">
<script>
function factorial(a){if(!(isNaN(a)||0>a)){if(1>=a)return 1;for(var c=1;0<a;c*=a,a--);return c}}function strong(a){return"<strong>"+a+"</strong>"}function judgement(a){switch(Math.floor(a)){case 100:return"Perfect!";case 50:return"Awesome!";case 16:return"Sketchy!";case 4:return"Discomfort Ahead!";default:return"Avoid!"}}function shuffle(a){for(var c=a.length,f,e;c;)e=Math.floor(Math.random()*c--),f=a[c],a[c]=a[e],a[e]=f;return a}
document.addEventListener("DOMContentLoaded",function(){var a=document.querySelector("#arity-form"),c=document.querySelector("#screen"),f=c.querySelector("#percentage"),e=c.querySelector("#explainer");a.addEventListener("submit",function(b){b.preventDefault();b.stopPropagation();b=b.target.arity.value;var d=factorial(Number(b));d=Number((1/d*100).toFixed(2));info="If you guessed the order of the parameters of a function with an arity of "+strong(b)+", you'd be right "+strong(d+"%")+" of the time.";
f.innerHTML=d+"% -- "+judgement(d);e.innerHTML=info;c.style.display="block"});a=document.querySelector("#bio");var h=document.querySelector("#bio-box"),k=h.querySelector("#bio-screen");a.addEventListener("submit",function(b){b.preventDefault();b.stopPropagation();b=Array.from(b.target.elements).filter(function(g){return"INPUT"===g.nodeName}).map(function(g){return g.value});b=shuffle(b);var d=b[1],l=b[2],m=b[3];k.innerHTML="Dear employer, my name is "+strong(b[0])+" "+strong(d)+". My Twitter handle is "+
strong(l)+", and I contribute to open source with the GitHub username "+strong(m)+". Hire me!"});h.style.display="block"});
</script>
  <div id="screen" style="display:none;margin-bottom:20px">
    <div id="percentage" style="font-size:2em;font-family:monospace"></div>
    <div id="explainer" style="font-family:monospace"></div>
  </div>

  <input name="arity" type="number" min="0" max="10" value="1">
  <input type="submit" value="can i guess?">
</form>

You can put your intuition to test here. Below are input fields which collect arguments for a
function that prepares a sweet bio for your CV based on your first name, last name, Twitter, and
GitHub handles. Can you guess which input field corresponds to what argument?

<div style="overflow:auto;margin-bottom:20px">
  <form style="background:#333;border-radius:15px;padding:10px;float:left;margin-right:20px" id="bio">
    <h3 style="font-size:1.2em;text-align:center">Make Me a Bio</h3>
    <div style="font-family:monospace">
      <div><input required style="border-radius:5px;padding:5px"></div>
      <div><input required style="border-radius:5px;padding:5px"></div>
      <div><input required style="border-radius:5px;padding:5px"></div>
      <div><input required style="border-radius:5px;padding:5px"></div>
      <div style="margin-top:5px"><button type="submit">Make Bio</button></div>
    </div>
  </form>
  <div style="display:none;width:60%;font-family:monospace;float:left;border-radius:5px;padding:10px;" id="bio-box">
    <div id="bio-screen"></div>
  </div>
</div>

Did you give it a try? Could you figure out the order of the parameters? God is with you if you did.
Otherwise this is what probably happened: You thought the first input was first name, closely
followed by last name. You were probably uncertain of the order of the Twitter and GitHub handles,
but you found a (false) clue in the description of the function and thought it was Twitter first,
followed by GitHub. But reality didn't match expectation and so after a couple of tries you probably
gave up. You subconsciously acknowledged that some form of documentation was necessary. "How is
anyone expected to use the function without it?" you ask.

Did you give up? Did you peek under the hood for help? Did you find it there? Did you feel
miserable?  If you did, you're not alone. Anybody who has tried to use a date/time function feels
the same. And they usually have an arity of 6 and above. Can you imagine?

To date, figuring out the order of a function's parameters is the number one reason I look at its
documentation. In my opinion, referring to documentation or source code for no other reason than to
learn the order of a function's arguments is unacceptable. It's a fixable problem, and we should
actively work to fix it.

## The Fix

We have seen that after three parameters our ability to intuit deteriorates beyond repair.  Anything
lower than three and our intuition is good enough. For example, we can guess with 100% accuracy the
order of arguments to a zero- and single-parameter functions and we don't have to consult any
documentations. At two, our accuracy drops to 50%. Trial and error makes sense here: if one ordering
doesn't work the other will. Again, we avoid another trip to the documentation or source code in
search of the _right_ order.

How do we put this discovery to use? Can we still make powerful and useful functions if we set
maximum arity to two?

I'm glad you asked. The answer is yes. I argue in favor of zero, one, and two arity functions below.

### Zero-Parameter Functions (`fn/0`)

In imperative (or mutative) programming, zero-parameter function can be achieved with instance
methods. Below is a class that represents a document. It has two methods, `encrypt` and `publish`
which take zero arguments but are able to achieve their goals because they have access to the
internal state of the instance:

{% highlight ruby linenos %}
class Document
  # NOTE: We will fix this definition of initialize in the
  # next section when we make rules for one-argument functions.
  # All hope is not lost.
  def initialize(title, content, author, publisher, published, free)
    @title     = title
    @content   = content
    @author    = author
    @publisher = publisher
    @published = published
    @free      = free
  end

  # Returns an encrypted version of the document.
  # Please note: This is not how to encrypt.
  def encrypt
    @content.reverse
  end

  # Makes the document available on the interwebz.
  def publish
    @published = true
  end
end
{% endhighlight %}

Zero-parameter functions are meaningless in functional programming.

### Single-Parameter Functions (`fn/1`)

Consider [Elm], the delightful language for reliable web apps. As at the time of writing, all
functions in Elm are defined with one and only one parameter. This is a non-negotiable and
intentional constraint. [Haskell] too. These languages are able to achieve this because they rely
heavily on (lightweight) types. They're [typeful languages][typefullang]. Composite types!  Types,
with their named fields, erase the necessity of positions.

They're a pleasure to document, use in conversations. Even more to use them. Take for example a
hypothetical `send_email/1` function which sends, you guessed it, emails.

For a hypothetical `send_email/1` function, all we need for documentation as far as parameters are
concerned is: `send_email/1` takes an `email` (with `email` hyperlinked to its documentation).
Otherwise things get kinda messy: `send_email/8` takes the following parameters in this order:
_from_, _to_, _reply\_to_, _cc_, _bcc_, _subject_, _text\_body_, _html\_body_.  Depending on who
should be cc-ed or bcc'ed and whether or not you want both text and HTML body, you're left with
sawtoothed calls such as below.

{% highlight ruby %}
send_email(
  "from@mail.com",
  "to@mail.com",
  "",
  [],
  [],
  "Subject",
  "Text Body",
  ""
)
{% endhighlight %}

As you can see, exploding the email type and passing it's fields as individual arguments to
`send_email/8` introduces unnecessary overhead. It doesn't make for great conversation either.

Now, I said _lightweight_ types because I want to exclude classes like we get in Ruby, Python, Java,
etc. They are not lightweight, either to create or to chug along. An empty Ruby class is already
bogged down by about 60 methods and attributes.  That heavy, it doesn't make sense to create them to
be used as function arguments. Python's [namedtuple] comes close to a lightweight type.  I've used
[Elixir] and [Go]'s struct with a lot of delight. They are lightweight composite types that are fit
for the purpose of single-parameter functions. We need something more lightweight in Ruby.

In the absence of lightweight, named data structures to pass to our functions, we should turn to
classes and methods. They can do a good job.  For example, `send_email/8` easily becomes `send/0` on
an Email class. With chain-able implementations of `from`, `to`, `subject`, etc., this beauty is a
possibility:

{% highlight ruby %}
email = Email.new
email.
  from("a@b.c").
  to("d@e.f").
  bcc(["g@h.i"]).
  subject("hey").
  text_body("text").
  html_body("html").
  send()
{% endhighlight %}

Empty initialization, attributes set with chain-able methods. Come to think of it, this gives us
better API stability: when we don't initialize new instances with arguments but set and unset them
via methods we can easily add new attributes to the class without breaking existing code. A maxim is
in order: *Initialize empty, build later*.

But maps, I hear you say. Yes, hashmaps or objects or dictionaries or associative arrays cut it.
With them we don't have to worry about order anymore.  I'll take them over sawtoothed calls. I wish
maps could be typed though.

I consider variadic functions as single-parameter too. For example, [Go rewrites variadic arguments
to a single slice argument][GoVarArgs]. More importantly, order doesn't matter, which is what we're
ultimately striving for.

Types and classes get as far. Little, tiny, specific, special-purpose classes can make it possible
to not exceed a single-parameter. Use them liberally to achieve this goal. Pass a data structure to
the function. It's most likely all you need. Add another method to the class.

### Two-Parameter Functions (`fn/2`)

Very rare cases. Very special functions. Functions for comparisons, swaps, diffs, every function
that needs two and exactly two things, of the same type usually. More than two and we can replace
with a list instead and a single-parameter function.

Another special group of functions in this category is what I call _applicators_. These are
functions that apply other functions to their arguments.  Think of `map`, `reduce`, `filter` of an
iterable data type. Their imperative cousins can still remain single-parameter.

Another group is _registrar_ functions. They usually register callbacks. The first argument is a
known, predictable event. The second argument is usually a function to call or notify. Very popular
in Pub/Sub systems such as event handling (see DOM's JS API).

These special-purpose functions enable extensibility.  I think _applicators_ are a brilliant idea.
If your function takes 2 arguments could it be for the reason of extensibility? Shouldn't the second
argument be a callable?

Of course there's always that one function that lies outside all patterns. You're unlucky if you
have to write them. All I can do is wish you well.  I hope it doesn't become your norm.

OK I'll end here. This rant is already longer than it should have been. I've been unhappy at my work
lately and found it a good way to vent about my frustrations. But I like how it turned out. I hope
that in a follow up post I'm able to articulate a few rules I personally follow for making
delightful functions. And I hope you'll find them useful.

## Closing Thoughts

I'll leave you with this closing statement. It's often said that code is written to be read by
humans. The sequel to that is, _and functions are created to be used by humans_.

Next time you build an API keep this advice in mind. Be considerate of, first, your future self, and
then your users. Intuition is a good thing; reinforce them! Above all, create and use types, and
keep function parameters to a maximum of two.  As I tried to show, it's very possible.  Colleagues,
strangers on the internet who find solace in your work, your future self, and more importantly, your
ongoing self will be thankful.

_Got comments or corrections for factual errors?  There's a [Hacker News thread for
that][FuncParamsHN]_.

[Arity]:        https://en.wikipedia.org/wiki/Arity/
[Elm]:          http://elm-lang.org/
[TypefulLang]:  http://lucacardelli.name/papers/typefulprog.pdf
[Haskell]:      https://www.haskell.org/
[Clojure]:      https://clojure.org/
[Elixir]:       https://elixir-lang.org
[Go]:           https://golang.org
[VarArgs]:      https://en.wikipedia.org/wiki/Variadic_function
[namedtuple]:   https://docs.python.org/3/library/collections.html#namedtuple-factory-function-for-tuples-with-named-fields
[GoVarArgs]:    https://github.com/golang/go/blob/bf9240681dec2664f6acc1695e517e985d2b85d3/src/go/types/typexpr.go#L453
[FuncParamsHN]: https://news.ycombinator.com/item?id=18160370
