document.addEventListener('DOMContentLoaded', function() {
  const publications = document.querySelectorAll('ol.all > details > ul.publications > li');
  if (publications.length > 0) {
    publications.forEach((li, index) => {
      li.dataset.number = index + 1;
    });
  }

  // Copy a publication's citation to the clipboard when its "cite" link is clicked.
  function showCopied(link) {
    if (link.dataset.busy) return;
    link.dataset.busy = '1';
    const original = link.textContent;
    link.classList.add('copied');
    link.textContent = link.dataset.copiedLabel || 'copied!';
    setTimeout(function() {
      link.textContent = original;
      link.classList.remove('copied');
      delete link.dataset.busy;
    }, 1500);
  }

  function copyCitation(link) {
    const text = link.dataset.cite || '';
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) { /* ignore */ }
      document.body.removeChild(ta);
      showCopied(link);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() { showCopied(link); }, fallback);
    } else {
      fallback();
    }
  }

  document.querySelectorAll('a.cite-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      copyCitation(link);
    });
    link.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copyCitation(link);
      }
    });
  });
});
