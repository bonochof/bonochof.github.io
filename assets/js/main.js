document.addEventListener('DOMContentLoaded', function() {
  const publications = document.querySelectorAll('ol.all > details > ul.publications > li');
  if (publications.length > 0) {
    publications.forEach((li, index) => {
      li.dataset.number = index + 1;
    });
  }
});
