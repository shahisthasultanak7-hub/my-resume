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

(function () {
  const fab = document.getElementById('chatFab');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  const chips = document.querySelectorAll('.chat-chip');

  if (!fab || !panel || !closeBtn || !form || !input || !messages) {
    return;
  }

  const rules = [
    { keys: ['name', 'who are you'], answer: 'Shahistha Sultana K' },
    { keys: ['location', 'where', 'based'], answer: 'Bangalore, India' },
    { keys: ['experience', 'years'], answer: '8+ years in BI and analytics' },
    { keys: ['current', 'role'], answer: 'Senior Business Intelligence Developer at Oracle Cerner (Dec 2022 - Present)' },
    { keys: ['skills', 'stack', 'tools'], answer: 'Tableau Desktop/Server, Oracle Analytics Cloud, Advanced SQL/PL-SQL, ETL/ELT, ADW, Oracle, Snowflake, Vertica, Git, JIRA' },
    { keys: ['education', 'degree'], answer: 'M.Tech in Computer Science Engineering (VTU, 2018-2020, 85%) and B.E in Computer Science Engineering (Anna University, 2006-2010, 90%)' },
    { keys: ['certification', 'certifications'], answer: 'Leading SAFe 6.0 Agilist, OCI 2025 Generative AI Professional, Oracle 9i Certified, Indian Institute of Banking and Finance Certified' },
    { keys: ['linkedin'], answer: 'https://www.linkedin.com/in/shahistha-kareem-basha-a89802190' },
    { keys: ['email', 'contact'], answer: 'shahisthasultanak7@gmail.com' },
    { keys: ['phone', 'mobile'], answer: '+91 99622 28727' },
    { keys: ['tableau', 'dashboard', 'portfolio', 'vizzes'], answer: 'Tableau Public profile: https://public.tableau.com/app/profile/shahistha.sultana.k/vizzes' },
    { keys: ['award', 'recognition'], answer: 'Cerner "You Rock" Award (3x) and Cerner "Bravo" Recognition' }
  ];

  const normalize = function (text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const append = function (text, cls) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + cls;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  };

  const answerQuestion = function (question) {
    const q = normalize(question);
    if (!q) {
      return 'NA';
    }

    let best = null;
    let bestScore = 0;
    for (let i = 0; i < rules.length; i += 1) {
      const rule = rules[i];
      let score = 0;
      for (let j = 0; j < rule.keys.length; j += 1) {
        if (q.includes(rule.keys[j])) {
          score += 1;
        }
      }
      if (score > bestScore) {
        best = rule;
        bestScore = score;
      }
    }

    if (best && bestScore > 0) {
      return best.answer;
    }
    return 'NA';
  };

  const openChat = function () {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    input.focus();
  };

  const closeChat = function () {
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
  };

  fab.addEventListener('click', function () {
    if (panel.hidden) {
      openChat();
    } else {
      closeChat();
    }
  });

  closeBtn.addEventListener('click', closeChat);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) {
      return;
    }
    append(question, 'user');
    append(answerQuestion(question), 'bot');
    input.value = '';
  });

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      const q = chip.textContent || '';
      append(q, 'user');
      append(answerQuestion(q), 'bot');
      openChat();
    });
  });
})();
