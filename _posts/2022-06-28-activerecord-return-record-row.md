---
layout: post
title: ActiveRecord should ask for more than record identifier
---

This post is targeted at Rails developers who use [`ActiveRecord`][AR] with,
obviously, a relational database that allows setting functions as a columns
default. [PostgreSQL] for example.

## What We Wanted

I took part in discussions of an [issue][deffunc] that led to `ActiveRecord`
migrations accepting and delegating column default values to a native database
function. PostgreSQL already had this.  For as long as I've used it, it's been
possible to set the default value of a column to a function, either one that
comes with PostgreSQL, an extension, or a custom procedure. ActiveRecord just
didn't have the facility to do that. Well, you could still `execute` your way to
this desired state.

This was our past (with the mandatory `down` migration specification since we
called `execute`):

{% highlight ruby linenos %}
class CreatePosts < ActiveRecord::Migration
  def up
    create_table :posts do |t|
      t.string :title

      t.timestamps
    end
    execute <<~SQL
      alter table posts
        alter title
        set default some_function()
    SQL
  end

  def down
    drop_table :posts
  end
end
{% endhighlight %}

And this is our present and future (which I love so much):

{% highlight ruby linenos %}
class CreatePosts < ActiveRecord::Migration[5.2]
  def change
    create_table :posts do |t|
      t.string :title, default: -> { "some_function()" }

      t.timestamps
    end
  end
end
{% endhighlight %}

Now it's easier to set a database function as the default value of a column
using an automatically reversible migration. Lots to love, and a proper thank
you is in order to whoever worked on it.

Solving this problem led to another. If you read the comments on the
[issue][deffunc], you'll see what I'm talking about. A new [issue][returning]
has been created to address it.  That is what I address in this post.

## The Database As A Dumb Store

An ORM, like every other abstraction, tries to live by the true meaning of the
word [abstraction].  It doesn't demand of you a blind trust but rather it
_demands_ that you think of your database, sorry persistence layer (and this is
the first pitfall), as, you guessed it, a _persistence_ layer.  The place where
you store stuff that survive a crash, shutdown, or anything else that makes the
computer lose its memory.

Unfortunately the database isn't a dumb store. As the server tasked with
ensuring storage and integrity of data, it gets to have the last word.  And
rightly so. It shouldn't (and doesn't) delegate this responsibility to any
application (or layer) above it. It would be irresponsible and lazy of the
database if didn't perform this task.

What this means is that a couple of validations in your `ActiveRecord` model
isn't enough to ensure data integrity. Technically, bad data could still end up
in your database.

It also means that when you send a valid query to the database it might not even
get the chance to run. It could be summarily aborted or heavily modified before
it's applied. There's not much to worry about when the query is aborted. As far
as I can tell, `ActiveRecord` will behave appropriately. It is when the query is
modified that things could take a bad turn because of `ActiveRecord`'s
confidence that it knows what the database will do with such a query. This is
not hubris—it's all good intentions.  After all it's an abstraction, one that
requires you to not pay a lot of attention if any at all to the underlying
database, vague-ified as the _persistence layer_.

## Pitfalls

`ActiveRecord`'s confidence is a pitfall. In most cases it does exactly what you
want it to. You start fighting (and eventually hating) it when you have columns
with default values generated by the database during insert and/or columns whose
eventual value is affected by the result of a trigger.

## What You Insert/Update Is Not What Is Stored

Remember when we said that the database, as part of its job to ensure data
integrity, determines the fate of all queries (and their values) it receives? If
a query isn't aborted but run, then the eventual values stored could be very
different than what was originally submitted. Let's look at two of such cases.

### Function Defaults

When the default of a column is a function (such as `now()`,
[`gen_random_uuid()`][gen_rand], etc) the stored value is generated at
_insert-time_ (to use the _compile-time_, _runtime_ lingo).  Function defaults
are awesome. `gen_random_uuid()` might be the most popular but stored procedures
are easy to write, can be as complex as needed, and are tucked away in the
database. But `ActiveRecord` punishes you for using a strength of the database.

### Triggers

Triggers are like a Pub/Sub system. They allow you to listen to events and
perform actions before or after they're applied. The staple of trigger examples
is audit tables (tables that keep history of changes to other tables). A rather
simple example is normalizing some column values before they're stored. For
example, lowercasing email addresses before they're stored. Where they usually
shine is complex validations which depend on values in different tables. I've
used them liberally this way and enjoyed the benefit of keeping logic close to
the data they work on. If you haven't used triggers before take a look at them.
Again, `ActiveRecord` punishes you for using this incredible database feature.

### What's A Programmer To Do

The database has a mechanism of telling you what was the eventual values stored.
It's the [`returning`][pg_ret] clause that you can tuck to the end of your SQL
query to specify which values should be returned from the result of the query.
`returning *`, just like `select *`, returns the entire row, and these are the
truest values, which is what you'd expect when you've successfully inserted a
new row or updated an existing one.  But not with `ActiveRecord`.


### How `ActiveRecord` Punishes

Take for example the User model below. `token` has a database function as
default, while the `email` column's value is trimmed and lowered before it is
inserted or updated.

{% highlight ruby linenos %}
class CreateUsers < ActiveRecord::Migration[5.2]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :token, null: false, default: -> { "gen_random_uuid()" }

      t.timestamps
    end

    reversible do |dir|
      dir.up do
        execute <<-SQL
          create or replace function lower_trim_email()
          returns trigger as $$
          begin
            new.email = lower(trim(new.email));
            return new;
          end;
          $$ language plpgsql;

          create trigger trg_lower_trim_email
          before insert or update of email on users
          for each row
          execute procedure lower_trim_email();
        SQL
      end

      dir.down do
        execute "drop trigger trg_lower_trim_email on users"
        execute "drop function lower_trim_email()"
      end
    end
  end
end
{% endhighlight %}

{% highlight ruby %}
user = User.create(email: "  HeLLo@exaMPLe.oRg   ")
puts user.email # "  HeLLo@exaMPLe.oRg   "
puts user.token # nil
{% endhighlight %}

What happened here? During an `insert`, `ActiveRecord` only asks for the
autogenerated `id` back from the database. Thus, while a trimmed and lowercased
email address was stored in the database, the application continues to use the
original. Even worse, the user object doesn't have its `token` set. The
workaround is to immediately reload the model `after_{create,save}`, and that's
two queries already where one would suffice:

{% highlight ruby linenos %}
class Post < ApplicationRecord
  after_save :reload

  # If you only have default values and no triggers
  # that affect updates then use after_create instead.
  # after_create :reload
end
{% endhighlight %}

During an update, you can forget about what your triggers did to the values.
There is no `RETURNING` clause, even for the specific values that were changed.
This can produce a conflict where you work with one value in your application
but have another in the database. In the above example it does.

### The `ActiveRecord` Way

If immediately reloading models after save bothers you then don't use database
functions as default values. And don't use triggers either. Embrace
`ActiveRecord` fully and do as it expects: set the defaults in the model,
transform the attribute values (like trimming and lowercasing) before
persisting.

I look forward to what the resolution of this new [issue][returning] will bring.
It's more complex than just writing the code to attach `RETURNING *` to the
generated insert or update query. What I wish for is a directive on a model (in
the manner of `abstract_class`) that marks a model as one relying on database
features such as described above.


_Got comments or corrections for factual errors?  There's a [Hacker News thread
for that][SaveHN]_.

[AR]: https://guides.rubyonrails.org/active_record_basics.html
[PostgreSQL]: https://postgresql.org
[deffunc]: https://github.com/rails/rails/issues/21627
[returning]: https://github.com/rails/rails/issues/34237
[abstraction]: https://en.wikipedia.org/wiki/Abstraction_(computer_science)
[pg_ret]: https://www.postgresql.org/docs/current/static/dml-returning.html
[gen_rand]: https://www.postgresql.org/docs/10/static/pgcrypto.html#id-1.11.7.35.9
[SaveHN]: https://news.ycombinator.com/item?id=18271304
