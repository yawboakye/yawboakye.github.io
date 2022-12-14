---
layout: default
title: Archive
---

## Blog posts
{% assign postsByYearMonth = site.posts | group_by_exp: "post", "post.date | date: '%B %Y'" %}
{% for yearMonth in postsByYearMonth %}
  <ul>
    {% for post in yearMonth.items %}
      {% unless post.draft %}
        <li><span style="font-size:0.8em">{{ post.date  | date_to_string }}</span> » <a href="{{ post.url }}">{{ post.title }}</a></li>
      {% endunless %}
    {% endfor %}
  </ul>
{% endfor %}
