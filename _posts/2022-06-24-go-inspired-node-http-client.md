---
layout: post
title: Go-inspired HTTP clients in JavaScript
---

[APIs][0], particulary HTTP APIs, are the liveblood of most software applications. Building APIs is
a pretty decent enterprise, as well as using them. In this post I'll talk about a pattern I've
established for building integrations into external APIs. Before I proceed, I should say that
sometimes the external APIs developers are generous to develop [SDKs][1] to go with it.  There's a
lot of languages, and maintaining SDKs in all of them might be tedious. I use JavaScript (via
TypeScript), primarily, and there's almost always an SDK for the APIs I want to use. So why reinvent
the wheel? For a couple of reasons:

1.  It keeps dependencies to a minimum. SDKs are built for the entirety of the API. In my
    experience, we often use less than 20% of an API's offering, and in a very specific way.
2.  If coding style (enforced either by team or programming language) means anything to you (and
    your team), cranking out your own integration might be your best bet at keeping a consistent
    style.
3.  Typing: TypeScript adoption is still in its infancy. The APIs SDK might not ship with type
    declarations.

I take a lot of inspiration from the way Go's HTTP tools are built. Specifically, the idea that the
client is configured and ready to take a request, perform it, and return a result. I deviate
slightly: the client is configured for a specific API, takes a request, performs it, and set the
response on the original request object. Let me explain the different parts and the choice I made.

## The client

[Specimen][2].

At the core of it, the client configures a generic HTTP client to be very specific to the API at
hand: a base URL, authentication/authorization scheme, and content type. Client has a method called
[`do`][6], which performs the request. Before firing off the request though, it ensures that
necessary authentication/authorization is acquired. In the example client above, authentication is a
different call, with the result permanently added to the default headers.  Some times it's a query
parameter. At other times it's a certain property that should be set on all payloads that are sent
to the API. In short, the client should know how to take care of authentication/authorization so
that individual requests are not burdened.

Go also calls its HTTP clients executor method `Do`. As you can tell, the inspiration isn't
restricted to design philosophy.

## Requests

[Specimen][3].

Requests are classes that implement an interface defined by the client, for the benefit of its `do`
method. A request should have a `body` property, which can be used as the request's body or query
parameters. A `method` property for the HTTP method to use, and `to` property, which specifies the
endpoint path for the request. If a request has all three properties then the client can
successfully attempt an API call.

The chance to keep a consistent coding style, or rather, variable/attribute naming convention
happens here. In most JavaScript projects I've worked on, variables names are spelled using
camel-case. Unfortunately, this convention is thrown out of the door when dealing with external
input coming into our system. While the JSON data exchange format has its roots in JavaScript, the
snake-case (and sometimes dash-case, or whatever it's called) has become the de facto way to spell
attribute names. It leads to code like this:

{% highlight typescript linenos %}
createCharge({
  user_name: 'User Name',
  auth_token: 'authToken',
  amount_usd: 100
})
.then(data => {
  if (data.charge_status === 'created') {
    console.log(`${data.charge_id} for ${data.amount_usd} has been created.`)
  }
})
.catch(console.error)
{% endhighlight %}

This problem isn't solved by SDKs either. For example, Stripe's [Node SDK][7] sticks to the
snake-case spelling style. In the case of Stripe though, I'm willing to budge. It's a complicated
API.

The design of the request class is such that the params can be named and spelled differently than
what is eventually assembled into the body. This gives us an opportunity to get rid of all
snake-case spellings. In the example above, I use lodash's `snakecase` module to convert attribute
names. When the JSON response is received, before setting it on the request, the keys are
transformed (at all levels) into camel-case using, once again, lodash's `camelcase` module, and a
weak or strong type enforced. It depends on what you need the type for. The example above becomes:

{% highlight typescript linenos %}
createCharge({
  userName: 'User Name',
  authToken: 'authToken',
  amountUsd: 100
})
.then(data => {
  if (data.chargeStatus === 'created') {
    console.log(`${data.chargeId} for ${data.amountUsd} has been created.`)
  }
})
.catch(console.error)
{% endhighlight %}

Very consistent with our camel case convention.

## Metrics

As time goes on, knowing how things fail, how long they take to complete or fail, will become a
business requirement. We had a similar request for the external APIs we use. In our case it was easy
to add instrumentation. All the code went in the client's `do` method. Since actual requests were
instances of classes, `instance.constructor.name` gave us a good name we could use in our metrics.
There's quite a few good opportunities that open up with this design philosophy.

## The Bad

That said, there are quite a few pitalls to be aware of. The first and most important is that, it
might be a laborious task. And depending on commitment (both short and long term to both the API and
the code), might not be worth it. Sometimes the work required cannot be automated away. Some APIs
have crazy naming conventions. In my experience, a few of them have mixed snake-case, camel-case,
and whateverthisstyleiscalled. Dealing with them might not be an exciting enterprise.

P.S. Both specimens here are first and public examples of when we started to develop SDKs using the
pattern described here. There has been a few improvements since they were first made. For example,
where it's up to me, I no longer use [axios][4] and instead opt for [request][5].

Thank you.

[0]: https://en.wikipedia.org/wiki/Application_programming_interface
[1]: https://en.wikipedia.org/wiki/Software_development_kit
[2]: https://github.com/yawboakye/flopay-node/blob/master/src/client.ts
[3]: https://github.com/yawboakye/flopay-node/blob/master/src/services/receive/mmo.ts
[4]: https://github.com/axios/axios
[5]: https://github.com/request/request
[6]: https://github.com/yawboakye/flopay-node/blob/master/src/client.ts#L90
[7]: https://stripe.com/docs/api?lang=node
