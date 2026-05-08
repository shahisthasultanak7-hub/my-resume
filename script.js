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

  let autoTimer = null;

  const startAuto = function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    stopAuto();
    autoTimer = window.setInterval(function () {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const nearEnd = track.scrollLeft + getStep() >= maxScroll - 4;
      if (nearEnd) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        move(1);
      }
    }, 4500);
  };

  const stopAuto = function () {
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
  };

  viewport.addEventListener('mouseenter', stopAuto);
  viewport.addEventListener('mouseleave', startAuto);
  viewport.addEventListener('focusin', stopAuto);
  viewport.addEventListener('focusout', startAuto);

  startAuto();
})();
