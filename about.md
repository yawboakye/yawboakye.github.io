---
layout: page
title: About
---

<p class="message">
👋 I'm trialing this Google Calendar feature which let's you schedule
available/bookable time slots on your calendar. If you'd want to chat,
about anything at all, feel free to book a slot.<br /><br/>

<!-- Google Calendar Appointment Scheduling begin -->
<link href="https://calendar.google.com/calendar/scheduling-button-script.css" rel="stylesheet">
<script src="https://calendar.google.com/calendar/scheduling-button-script.js" async></script>
<script>
(function() {
  var target = document.currentScript;
  window.addEventListener('load', function() {
    calendar.schedulingButton.load({
      url: 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1uHs4R8BDfsxqi5Q9uRSQtbrz_TaLv6JO9zymvddKbipH37IHsiinggDgMczw5pn3sddUanOQF?gv=true',
      color: '#039BE5',
      label: 'Schedule a 1-on-1 with me!',
      target,
    });
  });
})();
</script>
<!-- end Google Calendar Appointment Scheduling -->
</p>
