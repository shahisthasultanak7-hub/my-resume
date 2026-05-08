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
    { keys: ['tableau', 'dashboard', 'portfolio', 'vizzes'], answer: 'Yes. Tableau is one of my core strengths. Tableau Public profile: https://public.tableau.com/app/profile/shahistha.sultana.k/vizzes' },
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

  const localRuleAnswer = function (question) {
    const q = normalize(question);
    if (!q) {
      return '';
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
    return '';
  };

  const adaptiveFallbackAnswer = function (question) {
    const q = normalize(question);
    if (!q) {
      return 'NA';
    }

    if (q.includes('aws') || q.includes('azure') || q.includes('gcp') || q.includes('cloud')) {
      return 'I have strong hands-on experience with cloud data/reporting platforms like ADW, Oracle, and Snowflake. While AWS is not listed as a primary delivery stack in this resume, I adapt quickly to adjacent cloud environments and can ramp up fast.';
    }

    if (q.includes('learn') || q.includes('adapt') || q.includes('new tool') || q.includes('new technology')) {
      return 'I am a fast learner with a strong track record of adapting to new analytics platforms, data models, and client environments while maintaining delivery quality.';
    }

    if (q.includes('do you know') || q.includes('experience with') || q.includes('worked on')) {
      return 'I may not have that exact keyword listed in this resume, but I have strong adjacent experience in enterprise BI, cloud data/reporting platforms, and rapid onboarding to new tools. I can ramp up quickly in similar environments.';
    }

    if (q.includes('do you know') && (q.includes('sql') || q.includes('tableau') || q.includes('oac') || q.includes('oracle analytics'))) {
      return 'Yes. This area is part of my core delivery experience.';
    }

    return 'NA';
  };

  const fetchModelAnswer = async function (question) {
    try {
      const res = await fetch('/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question })
      });
      if (!res.ok) {
        return '';
      }
      const payload = await res.json();
      return (payload.answer || '').toString().trim();
    } catch (err) {
      return '';
    }
  };

  const answerQuestion = async function (question) {
    const local = localRuleAnswer(question);
    if (local) {
      return local;
    }
    const isGitHubPages = window.location.hostname.endsWith('github.io');
    if (!isGitHubPages) {
      const model = await fetchModelAnswer(question);
      if (model && normalize(model) !== 'na') {
        return model;
      }
    }
    const adaptive = adaptiveFallbackAnswer(question);
    if (adaptive) {
      return adaptive;
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

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) {
      return;
    }
    input.disabled = true;
    append(question, 'user');
    append('Thinking...', 'bot');
    const loadingNode = messages.lastElementChild;
    const answer = await answerQuestion(question);
    if (loadingNode) {
      loadingNode.textContent = answer;
    }
    input.value = '';
    input.disabled = false;
    input.focus();
  });

  chips.forEach(function (chip) {
    chip.addEventListener('click', async function () {
      const q = chip.textContent || '';
      append(q, 'user');
      append('Thinking...', 'bot');
      const loadingNode = messages.lastElementChild;
      const answer = await answerQuestion(q);
      if (loadingNode) {
        loadingNode.textContent = answer;
      }
      openChat();
    });
  });
})();
