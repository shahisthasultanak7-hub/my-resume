(function () {
  const track = document.querySelector('[data-carousel="track"]');
  const viewport = document.querySelector('[data-carousel="viewport"]');
  const prev = document.querySelector('[data-carousel="prev"]');
  const next = document.querySelector('[data-carousel="next"]');

  if (!track || !viewport || !prev || !next) {
    return;
  }

  const getStep = function () {
    const card = track.querySelector('.viz-card');
    if (!card) {
      return viewport.clientWidth;
    }
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || '12');
    return card.getBoundingClientRect().width + gap;
  };

  const move = function (dir) {
    track.scrollBy({ left: dir * getStep(), behavior: 'smooth' });
  };

  prev.addEventListener('click', function () {
    move(-1);
  });

  next.addEventListener('click', function () {
    move(1);
  });
})();
