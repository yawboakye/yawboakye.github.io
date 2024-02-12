---
layout: post
title: Using environment variables
---

Especially for web applications, the software is usually considered to run in an
environment. Usually, the difference between any two environments is defined by
_environment variables_. They could define everything from the database(s) to
connect to through what API keys to use (e.g. livemode vs testmode) to log
levels. Usually, during startup, the application realizes what environment it is
running in, then configures itself appropriately. After the application is up
and running, there's barely any good reason for it to try to figure out its
running environment.

In the code base I work on, this is how we've used environment variables.  In my
code base, we have used some environment variables to influence logic in
different places. This is a story of how it made life difficult for us during
tests and two solutions we have come up with to address it.


## Case

Before the application starts, we load all environment variables (they are
OS-level environment variables, to be specific), cast to the appropriate types,
and set necessary defaults.  Any part of the code would import the environment
variables module if it needed to. Nice and clean.  A simplified example,

{% highlight typescript linenos %}
import * as env from 'config/env'
function processTransaction (id: string) {
    const transaction = getTransaction(id)
    const result = process(transaction)
    if (env.rewardCustomer) {
        const customer = getCustomer(transaction.customer)
        rewardCustomer(customer)
    }
    return result
}
{% endhighlight %}

All well and good, until we have to test. In our attempt to cover both cases, we
have to test the `processTransaction` function once with `rewardCustomer` as
false, and another with it as true. This essentially means that we can't set it
to one value in the test environments. Taking the whole test suite into
consideration also means that it is likely unwise to set it to any value at all.
That's when we came up with our first approach: make it possible to overwrite
some environment variables when running certain test cases. We add a new
`runWithEnvAs`  function to the environment variables modules. Its
implementation is similar to this:

{% highlight typescript linenos %}
runWithEnvAs (envOverwrites: object, func: () => any) {
  const original = {}
  // resets environment variable to original.
  const reset = () => {
    Object.entries(original).forEach(([k, v]) => {
       store[k] = v
    })
  }
  // overwrite.
  Object.entries(envOverwrites).forEach(([k, v]) => {
    if (store.hasOwnProperty(k)) {
      original[k] = store[k]
      store[k] = v
    }
  })
  // now, run the function.
  try {
    func()
  } finally {
    reset()
  }
}
{% endhighlight %}

During tests, one could safely overwrite any environment variable as such:

{% highlight typescript linenos %}
import * as env from 'config/env'
describe('processTransaction', () => {
  env.runWithEnvAs({rewardCustomer: false}, () => {
    it('does not reward customer', () => {...})
  })
  env.runWithEnvAs({rewardCustomer: true}, () => {
    it('rewards customer', () => {...})
  })
})
{% endhighlight %}


## Complication

On the surface, the problem was gone. We could now set and unset variables as
and when we wanted, and we could test the behavior of any function given any
value of an environment variable. But there was still some discomfort. First was
that we had to introduce the `runWithEnvAs` function in the environment
variables module, only to be used during tests. Not that anyone will, but it
could definitely be used in other environments as well.  Secondly, tests that
require the overwrites are ugly to write and look very out of place. There were
no explanations for the specific overwrites: why is `rewardCustomer`
overwritten?  A few days into using the new `runWithEnvAs`, we realized we had
conjured what looked like a clever (or stupid, depending on who you ask) but
dangerous trick to hide a major dependency of the `processTransaction` function.
Rewriting a few more test cases drove the point home. Sure, there was code that
used environment variables but didn't have to be tested for different values of
the variable, but they too could benefit from whatever we eventually arrived at.


## Solution

The fix was quite simple: update all functions that use environment variables
implicitly to accept an explicit argument. How this wasn't the first thing that
came to mind is a testament to our ability to overthink problems, or rather, not
be able to step back and ask the right questions.  Here, the question we asked
ourselves was, _how do I run a given test case with a preferred value for a
given environment variable?_ I honestly don't know what would have been a more
right question to ask. Here's `processTransaction` and its tests after the
change:

{% highlight typescript linenos %}
type ProcessOpts = {rewardCustomer: boolean}
function processTransaction (id: string, {rewardCustomer}: ProcessOpts) {
  const transaction = getTransaction(id)
  const result = process(transaction)
  if (rewardCustomer) {
    const customer = getCustomer(transaction.customer)
    rewardCustomer(customer)
  }
  return result
}
// Tests.
describe('processTransaction', () => {
  it('rewards customer', () => {
    processTransaction(id, {rewardCustomer: true})
    ...
  })
  it('does not reward customer', () => {
    processTransaction(id, {rewardCustomer: false})
    ...
  })
})
{% endhighlight %}

In essence, it was a classic application of the [Dependency injection][0]
principle, which we had applied at the service level. I had never thought of it
at such low level, but basically getting rid of any implicit dependencies and
asking callers to pass an argument helped us clean up the code significantly.
After the refactor, we were able to get rid of all environment variables in the
test environment except those necessary for starting the application, such as
database URLs, API keys, and log levels.  It is not very often that we stumble
on an application of a well-known principle in the remotest of places. I left
this encounter asking myself what other principles do I expect to see in the
large but have even more sane implication at the very low level? We're always
learning.

[0]: https://en.wikipedia.org/wiki/Dependency_injection
