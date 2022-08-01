---
layout: post
title: Monitoring Go Applications with Monit
---

## Out-of-Memory

[Out-of-Memory (OOM)][OOM] is a state in which the operating system has ran out of free memory to
allocate to a process that needs it. When this happens an already running process has to be
sacrificed to free up enough memory. Which process is killed, by the OOM killer, depends on a
time-tested heuristic that selects for bad OOM score. OOM score (also known as _badness score_) is a
cumulative statistic of how well or poorly a process uses system resources. Usually when a process
uses a lot of memory, it has a high badness score, which consequently makes it a prime target of the
OOM killer.

## Go and OOMs

It's [well-known that OOMs are tough on Go applications][GoOOM]. Go 1.11 memory management
improvements promise to keep the OOM killer at a safe distance. But that respite isn't always
enough. As I write this, my long running Go application (compiled with 1.11, of course) has a
badness score of 18[^fn-oom_score], which puts it right in the crosshairs of
the killer. The application under consideration is a concurrent audio streams recorder and
processor.  At the peak of its activity it hoards a significant amount of memory. This memory
requirement won't change. Likewise the OOM killer won't relent. I mean, with such a reputation the
OOM killer is bound to develop an appetite for terminating my crucial but memory-intensive
application. Fair.

Hence, I needed a solution which will resurrect the application after it has been killed.

## The Solution

If you're familiar with [Erlang] or [Elixir], you probably jumped ahead and said, yup, what you
need is a supervisor[^fn-beam_otp_supervisor].  And you're probably right.

Unfortunately, Go, like most other programming languages, lacks a supervision tree in the manner of
Erlang/Elixir's. You could build one, specific to your application, but I found Monit to be exactly
the process monitor I needed. Besides, whatever I was going to build wasn't going to give me the
assurance of the Erlang/Elixir supervisor nor the low footprints of Monit.

## Monit

[Monit] is a small utility for managing and monitoring Unix systems. It can monitor a process and
respond to specific events with pre-defined actions. Monit runs in cycles (defaults to 2 minutes
apart), and during each run it figures out the state of the process. If the process is dead it will
be restarted with the `start program` action.

### Installation

If there isn't a package for your Linux/Unix distribution, you can follow the instructions
[here][MonitDownload] to download and install Monit on your system. On Ubuntu, my Linux distro, it's
as simple as

{% highlight shell %}
$ sudo apt install monit
{% endhighlight %}

and after a successful installation, started with

{% highlight shell %}
$ monit
{% endhighlight %}

### Setup

In my case I wanted to monitor the main process of my Go application and restart whenever it fell
prey to the OOM killer. I added `recorder.monit` to my application root with the following contents:

{% highlight shell %}
check process recorder with pidfile /var/run/recorder.pid
  start program = "/etc/init.d/recorder start"
  stop program = "/etc/init.d/recorder stop"
{% endhighlight %}

Next I symlinked to a directory from which Monit loads extra configurations. Which means that next
time Monit (re)starts, the recorder process, whose pid is written to `/var/run/recorder.pid` will be
monitored. And that is where the pid of my memory intensive Go application is written to. All set,
but I don't reload Monit yet.

{% highlight shell %}
$ ln -s /path/to/recorder.monit /etc/monit/conf.d/recorder
{% endhighlight %}

As you can see in the Monit configuration above, I opted for an init script for starting and
stopping the application. Below is the contents of `recorder.sh`, my init script, which I added to
the root of the application files:

{% highlight shell %}
#! /bin/sh
set -e

### BEGIN INIT INFO
# Provides:          recorder
# Required-Start:    $local_fs $network
# Required-Stop:     $local_fs $network
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: AF Radio audio stream recorder
# Description:       AF Radio audio stream recorder
### END INIT INFO

export PATH=$PATH:/usr/local/bin

BASE=recorder_with_fingerprint-0.1.0
DB_PATH=/var/local/afaudio.db

LINUX_BIN=/usr/local/bin/$BASE-linux-amd64
LOGFILE=/var/log/recorder.log
PIDFILE=/var/run/recorder.pid # managed by app
RECORDER_PIDFILE=/var/run/$BASE.pid # managed by start-stop-daemon
RECORDER_DESC="AF Radio Audio Recorder"

# log_begin_msg, log_end_msg, log_warning_msg
source /lib/lsb/init-functions

# Handle start, stop, status, restart
case "$1" in
  start)
    log_begin_msg "Starting $RECORDER_DESC"
    start-stop-daemon --start --background \
      --no-close \
      --oknodo \
      --exec "$LINUX_BIN" \
      --pidfile "$RECORDER_PIDFILE" \
      --make-pidfile \
      -- \
        -pidfile "$PIDFILE" \
        -logfile "$LOGFILE" \
        -db "$DB_PATH"
    
    log_end_msg $?
    ;;

  stop)
    if [ -f "$RECORDER_PIDFILE" ]; then
      log_begin_msg "Stopping $RECORDER_DESC"
      start-stop-daemon --stop --pidfile "$RECORDER_PIDFILE" --retry 1

      log_end_msg $?
    else
      log_warning_msg "Recorder already stopped."
    fi
    ;;

  restart)
  recorder_pid=`cat "$RECORDER_PIDFILE" 2>/dev/null`
  [ -n "$recorder_pid" ] \
    && ps -p $recorder_pid >/dev/null 2>&1 \
    && $0 stop
  $0 start
    ;;

  status)
    status_of_proc -p "$RECORDER_PIDFILE" "$BASE" "$RECORDER_DESC"
    ;;

  *)
    echo "Usage: service recorder {start|stop|restart|status}"
    exit 1
    ;;
esac

exit 0
{% endhighlight %}

Next, `recorder.sh` is made executable, symlinked to `/etc/init.d/` directory, and added to the list
of programs that should be started on boot. Then

{% highlight shell %}
$ chmod +x /path/to/recorder.sh
$ ln -s /path/to/recorder.sh /etc/init.d/recorder
$ update-rc.d recorder defaults
$ systemctl start recorder
{% endhighlight %}

Now I'm ready to reload Monit:

{% highlight shell %}
$ monit reload
{% endhighlight %}

It's a good feeling of liberation when you know your application will be restarted no matter how
many times it goes down, and without manual intervention. Well, as long as Monit itself stays alive.
As such I still check in once in a while (but less frequently), to see how both Monit and my
application are doing, and usually I see statistics like this

{% highlight plain %}
The Monit daemon 5.16 uptime: 2h 20m

Process 'recorder'
  status                            Running
  monitoring status                 Monitored
  pid                               12339
  parent pid                        1
  uid                               0
  effective uid                     0
  gid                               0
  uptime                            2h 20m
  threads                           6
  children                          0
  memory                            18.8 MB
  memory total                      18.8 MB
  memory percent                    0.5%
  memory percent total              0.5%
  cpu percent                       0.0%
  cpu percent total                 0.0%
{% endhighlight %}


_Got comments or corrections for factual errors?  There's a [Hacker News thread for that][MonitHN]_.

[^fn-oom_score]: I should mention that this isn't an indictment on Go's memory management; it's the nature of the application under consideration. It records audio tracks (to hard disk), reads them into memory for processing, before uploading to S3 storage.
[^fn-beam_otp_supervisor]: Erlang and Elixir have a thing called the supervisor tree. Roughly put, one (or more) of the processes started by your application acts as a supervisor of all child processes, and is able to bring them back up when they go down.

[GoOOM]:         https://blog.golang.org/ismmkeynote/
[OOM]:           https://lwn.net/Articles/317814/
[Erlang]:        https://www.erlang.org
[Elixir]:        https://elixir-lang.org/
[Monit]:         https://mmonit.com/monit/
[MonitDownload]: https://mmonit.com/monit/#download
[MonitHN]:       https://news.ycombinator.com/item?id=18050513
