function factorial(n) {
  if (isNaN(n) || n < 0)  return
  if (n <= 1) return 1

  var f = 1
  for (; n > 0; f *=n, n--);
  return f
}

function strong(str) {
  return "<strong>" + str + "</strong>"
}

function judgement(ptage) {
  switch (Math.floor(ptage)) {
    case 100: return "Perfect!"
    case 50:  return "Awesome!"
    case 16:  return "Sketchy!"
    case  4:  return "Discomfort Ahead!"
    default:  return "Avoid!"
  }
}

// A JavaScript implementation of the Fisher-Yates shuffle algorithm.
// Copied from https://bost.ocks.org/mike/shuffle/
function shuffle(array) {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

document.addEventListener("DOMContentLoaded", function () {
  var form = document.querySelector("#arity-form")
  var screen = document.querySelector("#screen")
  var percentage = screen.querySelector("#percentage")
  var explainer = screen.querySelector("#explainer")

  form.addEventListener("submit", function (e) {
    e.preventDefault()
    e.stopPropagation()

    var arity = e.target.arity.value,
        perms = factorial(Number(arity)),
        ptage = Number(((1/perms)*100).toFixed(2))
        info  = "If you guessed the order of the parameters of a function with an arity of " + strong(arity) +", you'd be right " + strong(ptage + "%") + " of the time."

    // Light up the screen.
    percentage.innerHTML = ptage + "% -- " + judgement(ptage)
    explainer.innerHTML = info
    screen.style.display = "block"
  })


  var bio = document.querySelector("#bio"),
      bioBox = document.querySelector("#bio-box"),
      bioScreen = bioBox.querySelector("#bio-screen")

  bio.addEventListener("submit", function (e) {
    e.preventDefault()
    e.stopPropagation()

    var values =
      Array.from(e.target.elements)
      .filter(function (e) { return e.nodeName === "INPUT" })
      .map(function (e) { return e.value })

    var values = shuffle(values)
    var firstName = values[0],
        lastName = values[1],
        twitter = values[2],
        github = values[3]

    bioScreen.innerHTML = "Dear employer, my name is " + strong(firstName) + " " + strong(lastName) + ". My Twitter handle is " + strong(twitter) + ", and I contribute to open source with the GitHub username " + strong(github) + ". Hire me!"
  })
    bioBox.style.display = "block"
})
