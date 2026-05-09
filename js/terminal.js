// ============================================================
// Terminal.js — terminal overlay, commands, easter eggs
// game is unlocked via 'parkour' or 'game' command
// ============================================================

export class Terminal {
  constructor(onGameUnlock) {
    this.overlay    = null;
    this.output     = null;
    this.input      = null;
    this.isOpen     = false;
    this.onGameUnlock = onGameUnlock;  // callback to Game instance
    this.konamiSeq  = [];
    this.KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                   'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    this._keyHandler = this._onKey.bind(this);
    this.pendingGameLaunch = false;  // waiting for ENTER to actually start
    this.pendingBossName   = null;
  }

  // ── Init ────────────────────────────────────────────────
  init() {
    this.overlay = document.getElementById('terminal-overlay');
    this.output  = document.getElementById('t-out');
    this.input   = document.getElementById('t-input');

    if (!this.overlay || !this.input) return;

    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = this.input.value.trim();
        this.input.value = '';
        // if awaiting launch confirmation, ENTER (empty) fires the game
        if (this.pendingGameLaunch && val === '') {
          this.pendingGameLaunch = false;
          const boss = this.pendingBossName;
          this.pendingBossName = null;
          this.onGameUnlock && this.onGameUnlock(boss || undefined);
          this.close();
          return;
        }
        this._run(val);
      }
    });

    // close on click outside
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });

    // close dot
    const redDot = this.overlay.querySelector('.tb-dot.r');
    if (redDot) redDot.addEventListener('click', () => this.close());

    window.addEventListener('keydown', this._keyHandler);
  }

  destroy() {
    window.removeEventListener('keydown', this._keyHandler);
  }

  _onKey(e) {
    // backtick toggle
    if (e.key === '`') { e.preventDefault(); this.toggle(); return; }
    if (e.key === 'Escape' && this.isOpen) { this.close(); return; }

    // konami
    this.konamiSeq.push(e.key);
    if (this.konamiSeq.length > this.KONAMI.length) this.konamiSeq.shift();
    if (this.konamiSeq.join(',') === this.KONAMI.join(',')) {
      this.open();
      setTimeout(() => {
        this._line('');
        this._line('🌿', 'special');
        this._line('ok. yes. weed. it\'s so good 🤤', 'out');
        this._line('i am a professional.', 'out');
        this._line('the servers are always up.', 'special');
        this._line('');
      }, 600);
      this.konamiSeq = [];
    }
  }

  // ── Open / close ────────────────────────────────────────
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add('open');
    this._boot();
    setTimeout(() => this.input && this.input.focus(), 80);
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.remove('open');
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  // ── Boot sequence ────────────────────────────────────────
  _boot() {
    this.output.innerHTML = '';
    const ascii = `██╗     ██╗████████╗████████╗██╗     ███████╗
██║     ██║╚══██╔══╝╚══██╔══╝██║     ██╔════╝
██║     ██║   ██║      ██║   ██║     █████╗  
██║     ██║   ██║      ██║   ██║     ██╔══╝  
███████╗██║   ██║      ██║   ███████╗███████╗
╚══════╝╚═╝   ╚═╝      ╚═╝   ╚══════╝╚══════╝
 
       E A G L E`;
    const pre = document.createElement('div');
    pre.className = 't-line ascii';
    pre.textContent = ascii;
    this.output.appendChild(pre);

    setTimeout(() => this._line('littleEagle OS v2.22 — welcome back', 'sys'), 100);
    setTimeout(() => this._line('type \'help\' for commands', 'out'), 200);
    setTimeout(() => this._line('[GAME] type \'parkour\' to unlock the platformer 🎮', 'game'), 350);
  }

  // ── Command runner ───────────────────────────────────────
  _run(raw) {
    if (!raw) return;
    this._line('λ ' + raw, 'prompt');

    const rawKey = raw.toLowerCase().trim();
    const key = rawKey.split(/\s+/)[0];

    // easter eggs: try full phrase first (multi-word), then first word
    if (this.EASTER[rawKey]) { this.EASTER[rawKey].call(this); return; }
    if (this.EASTER[key])    { this.EASTER[key].call(this);    return; }

    // commands
    const cmd = this.COMMANDS[key];
    if (cmd) { cmd.call(this, raw); return; }

    this._line(`command not found: ${raw}`, 'err');
    this._line('try: help', 'out');
  }

  // ── Output helpers ───────────────────────────────────────
  _line(text, cls = 'out') {
    const d = document.createElement('div');
    d.className = 't-line ' + cls;
    d.textContent = text;
    this.output.appendChild(d);
    this.output.scrollTop = this.output.scrollHeight;
  }

  _lines(arr) { arr.forEach(([cls, txt]) => this._line(txt, cls)); }

  // ── Commands ─────────────────────────────────────────────
  get COMMANDS() {
    return {
      help: () => {
        this._lines([
          ['sys', '─── available commands ───────────────────'],
          ['out', '  whoami      · the basics'],
          ['out', '  skills      · tech stack'],
          ['out', '  music       · discography'],
          ['out', '  bands       · band history'],
          ['out', '  work        · career'],
          ['out', '  status      · current status'],
          ['out', '  links       · social / contact'],
          ['out', '  clear       · clear terminal'],
          ['out', '  date        · current time'],
          ['out', '  secret      · ...'],
          ['game','  parkour     · 🎮 unlock the platformer'],
          ['game','  boss [name] · spawn a boss (cve/wisconsin/splunk/dependency/merge)'],
          ['sys', '─────────────────────────────────────────'],
        ]);
      },

      whoami: () => {
        this._lines([
          ['out', 'ERIK J. COHEN'],
          ['out', '  role     : Developer + Observability WG Lead'],
          ['out', '  org      : Epic Hosting'],
          ['out', '  degree   : Colby College \'22 — CS + Music CS'],
          ['out', '  gpa      : 3.7'],
          ['out', '  shift    : 3rd (nights)'],
          ['out', '  sign     : ♏ Sun  ♍ Moon  ♎ Rising'],
        ]);
      },

      skills: () => {
        this._lines([
          ['out', 'languages : ruby · python · go · js · c++ · java · m'],
          ['out', 'ops       : linux · puppet · puppet bolt · gitlab ci'],
          ['out', 'observe   : splunk · itsi · soar · alerting · metrics'],
          ['out', 'cloud     : azure · aws (yes i made a minecraft server)'],
          ['out', 'data      : pandas · numpy · sklearn · tensorflow'],
          ['out', 'net       : tls/certs · ports · tcp/ip · sockets'],
          ['out', 'music     : guitar · production · granular synthesis'],
        ]);
      },

      music: () => {
        this._lines([
          ['out', '→ You Will Turn Out Different (2023)'],
          ['out', '→ Adolescent Again EP (Drexel, 2019)'],
          ['out', '→ Breathing on Manual (covid hyperpop w/ Ben Lawlor)'],
          ['out', '→ Most of Me — The Verticals'],
          ['sys', 'all on spotify: search "littleeagle" or "erik cohen"'],
        ]);
      },

      bands: () => {
        this._lines([
          ['out', 'founding member:'],
          ['out', '  - The Verticals'],
          ['out', '  - Road Soda'],
          ['out', '  - Cabin Fever'],
          ['out', 'studio manager: WMHB Colby Radio \'20–\'22'],
        ]);
      },

      work: () => {
        this._lines([
          ['out', '2024–now  : Observability WG Lead · Developer'],
          ['out', '           ruby · python · go · splunk · soar · puppet'],
          ['out', '2022–2024 : ODBA · OS Admin (3rd shift)'],
          ['out', '           linux · networking · incident response'],
          ['out', '2021      : Research Assistant · Colby CS Dept'],
          ['out', 'clients   : Great River Health'],
          ['out', '           Great Ormond Street Hospital (prev)'],
        ]);
      },

      status: () => {
        const now = new Date();
        const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        const h = ct.getHours();
        const min = String(ct.getMinutes()).padStart(2, '0');
        const timeStr = `${h}:${min} CT`;
        const dow = ct.getDay(); // 0=Sun 6=Sat
        const isWeekday = dow >= 1 && dow <= 5;

        let vibe, color;
        if (h >= 12 && h < 21 && isWeekday) {
          vibe = 'probably at work. keeping servers alive.';
          color = 'accent2';
        } else if ((h >= 21 || h < 2) || (!isWeekday && h >= 10)) {
          vibe = 'home. vibe coding, making music, existing.';
          color = 'out';
        } else if (h >= 2 && h < 12) {
          vibe = 'probably asleep. in my bed. in wisconsin. (temporarily)';
          color = 'sys';
        } else {
          vibe = 'unclear. could be anything.';
          color = 'out';
        }

        this._lines([
          ['sys', `time     : ${timeStr}`],
          [color,  `status   : ${vibe}`],
          ['out',  'location : wisconsin'],
          ['out',  'hp       : ' + '█'.repeat(Math.floor(Math.random() * 4 + 7)) + ' ' + (80 + Math.floor(Math.random() * 20)) + '/100'],
        ]);
      },

      links: () => {
        this._lines([
          ['out', 'github    : github.com/ejcohe22'],
          ['out', 'linkedin  : linkedin.com/in/erik-cohen'],
          ['out', 'instagram : @erikbreadboiz'],
          ['out', 'leetcode  : leetcode.com/littleeagle'],
          ['out', 'email     : erikjkcohen@gmail.com'],
        ]);
      },

      date: () => {
        this._line(new Date().toString());
      },

      clear: () => {
        this.output.innerHTML = '';
      },

      secret: () => {
        this._lines([
          ['out', '...'],
          ['out', 'searching /dev/soul...'],
          ['out', '████████████████████ 100%'],
          ['out', ''],
          ['special', '  ✦ little eagle stands bear ✦'],
          ['out', '  istp · scorpio · night owl · 3rd shift forever'],
          ['out', '  midnight the cow was born when i onboarded'],
          ['out', '  this website is so that theres something when i die lmao'],
        ]);
      },

      parkour: () => {
        this._lines([
          ['game', '🎮 PARKOUR MODE UNLOCKED'],
          ['sys',  '─────────────────────────────────────────'],
          ['out',  '  ←→ / A D   move        SHIFT    sprint'],
          ['out',  '  SPACE       jump        Z        dash'],
          ['out',  '  X           punch       C        kick'],
          ['out',  '  V           spin kick   ↓+SHIFT  slide'],
          ['sys',  '  wall jump: run into wall → SPACE'],
          ['sys',  '  press G anytime to show/hide the game'],
          ['sys',  '─────────────────────────────────────────'],
          ['game', '  press ENTER to launch ↵'],
        ]);
        this.pendingGameLaunch = true;
        this.pendingBossName   = null;
      },

      game: () => { this.COMMANDS.parkour.call(this); },

      boss: (raw) => {
        const name = raw.split(' ')[1]?.toLowerCase();
        const valid = ['cve','wisconsin','splunk','dependency','merge'];
        if (!name || !valid.includes(name)) {
          this._line(`usage: boss [${valid.join('|')}]`, 'err');
          return;
        }
        this._lines([
          ['game', `🎮 boss fight: ${name.toUpperCase()}`],
          ['sys',  '─────────────────────────────────────────'],
          ['out',  '  ←→ / A D   move        SHIFT    sprint'],
          ['out',  '  SPACE       jump        Z        dash'],
          ['out',  '  X           punch       C        kick'],
          ['out',  '  V           spin kick'],
          ['sys',  '─────────────────────────────────────────'],
          ['game', '  press ENTER to launch ↵'],
        ]);
        this.pendingGameLaunch = true;
        this.pendingBossName   = name;
      },
    };
  }

  // ── Easter eggs ──────────────────────────────────────────
  get EASTER() {
    return {
      'sudo make me a sandwich': () => {
        this._lines([
          ['err', 'sudo: you\'re not in the sudoers file.'],
          ['out', '(jk here\'s a sandwich 🥪)'],
        ]);
      },
      'ls': () => {
        this._lines([
          ['out', 'drwxr-xr-x  music/'],
          ['out', 'drwxr-xr-x  code/'],
          ['out', 'drwxr-xr-x  vibes/'],
          ['out', '-rw-------  wisconsin_feelings.txt'],
          ['out', '-rwxr-xr-x  midnight_the_cow.gif'],
        ]);
      },
      'rm -rf /': () => this._line('absolutely not.', 'err'),
      'sudo rm -rf /': () => this._line('you wish.', 'err'),
      'coffee': () => {
        this._lines([
          ['out', 'New Englander born and raised.'],
          ['out', 'America runs on Dunkin'],
          ['out', '3am is peak productivity. do not @ me.'],
          ['out', '☕ brewing... '],
        ]);
      },
      'midnight': () => {
        this._lines([
          ['out', '🐄 moo.'],
          ['out', 'midnight was born august 2022.'],
          ['out', 'same month i onboarded. she is my coworker.'],
        ]);
      },
      'hyperpop': () => {
        this._lines([
          ['special', 'PC MUSIC FOREVER'],
          ['out', 'a.g. cook · oklou · underscores · 8485'],
          ['out', 'breathing on manual was the move'],
        ]);
      },
      'weed': () => {
        this._lines([
          ['special', '🌿'],
          ['out', 'this is a professional website.'],
          ['out', 'try the konami code.'],
        ]);
      },
      'wisconsin': () => {
        this._lines([
          ['err', 'ugh.'],
          ['err', 'cold. flat. too much cheese (ok the cheese is fine).'],
          ['err', '(temporarily)'],
        ]);
      },
      'friends': () => this._line('command not found: friends (file does not exist)', 'err'),
      'romance': () => this._line('command not found: romance (same error as friends)', 'err'),
      'exit': () => this._line('you can\'t leave. this is wisconsin.', 'sys'),
      'pwd': () => this._line('/home/littleeagle/wisconsin/against/my/will', 'out'),
      'ping happiness': () => {
        this._lines([
          ['out', 'PING happiness: 56 bytes'],
          ['err', 'Request timeout for icmp_seq 0'],
          ['err', 'Request timeout for icmp_seq 1'],
          ['err', '100% packet loss'],
        ]);
      },
      'git blame': () => {
        this._lines([
          ['out', 'a6f3c2e (wisconsin  2022-08-01) hired you here'],
          ['out', '4d1a9b3 (you        2022-08-01) made the best of it'],
        ]);
      },
      'uname -a': () => {
        this._lines([
          ['out', 'littleEagleOS 2.22 (neon-arcane) x86_64 Wisconsin'],
          ['out', 'uptime: ' + Math.floor(process?.uptime?.() || 1337) + 's (or like 3 years)'],
        ]);
      },
      'cat wisconsin_feelings.txt': () => this._line('Permission denied (and too painful)', 'err'),
    };
  }
}
