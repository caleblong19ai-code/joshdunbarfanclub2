(() => {
  const layer = document.querySelector('[data-popup-container]');
  if (!layer) return;

  const platinumButton = document.querySelector('[data-platinum]');
  const connectButton = document.querySelector('[data-connect]');
  const sequence = document.querySelector('[data-connection]');
  const denialMessage = document.querySelector('[data-denial-message]');
  let escalationTimers = [];
  let escalationRun = 0;
  let earlyPlatinumPending = false;
  const seen = new WeakSet();

  const injectStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      .bean-menace-window{max-width:min(680px,calc(100vw - 28px))}
      .bean-menace-window .menace-kicker{margin:0 0 8px;color:#9b0808;font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      .bean-menace-window .menace-status{margin-top:16px;padding:12px;border:2px solid #b00000;background:#fff3f3;color:#8d0000;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:.06em}
      .bean-menace-window .menace-small{margin-top:10px;font-size:.75rem;color:#4d4d4d}
    `;
    document.head.appendChild(style);
  };

  const randomPosition = (node, slot = 0) => {
    const width = Math.min(680, window.innerWidth - 28);
    const heightGuess = 330;
    const maxX = Math.max(10, window.innerWidth - width - 10);
    const maxY = Math.max(18, window.innerHeight - heightGuess - 18);
    const x = 10 + ((slot * 137 + Math.random() * 120) % Math.max(1, maxX - 10));
    const y = 18 + ((slot * 83 + Math.random() * 100) % Math.max(1, maxY - 18));
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.zIndex = String(13000 + slot);
  };

  const createMenaceWindow = (title, headline, body, status, slot) => {
    if (!layer.classList.contains('is-active')) return;
    const node = document.createElement('section');
    node.className = 'scare-window scare-window--danger bean-menace-window';
    node.innerHTML = `
      <div class="scare-titlebar"><span>${title}</span><button type="button" aria-label="Close fake Bean alert">×</button></div>
      <div class="scare-body">
        <p class="menace-kicker">Institute emergency bulletin</p>
        <h2 class="scare-flash">${headline}</h2>
        <p>${body}</p>
        <div class="menace-status">${status}</div>
        <p class="menace-small">This is a fictional Bean response simulation. The Institute assumes no responsibility for sudden barking.</p>
      </div>`;
    node.querySelector('button').addEventListener('click', () => node.remove());
    layer.appendChild(node);
    randomPosition(node, slot);
  };

  const menaceExistingWindow = (node) => {
    if (seen.has(node)) return;
    seen.add(node);

    const title = node.querySelector('.scare-titlebar span');
    if (!title) return;
    const titleText = title.textContent || '';
    const heading = node.querySelector('.scare-body h2, .scare-body h3');
    const red = node.querySelector('.scare-red');
    const ticker = node.querySelector('.scare-ticker');

    if (titleText.includes('CRITICAL WARNING')) {
      title.textContent = 'BEAN RESPONSE PROTOCOL — HE HAS BEEN NOTIFIED';
      if (heading) heading.textContent = 'Bean has acknowledged your access attempt.';
      const paragraphs = node.querySelectorAll('.scare-alert-row p');
      if (paragraphs[0]) paragraphs[0].innerHTML = '<strong>Bean Defender™</strong> has escalated this incident beyond automated enforcement. Bean is now handling the matter personally.';
      if (red) red.innerHTML = '<strong>BEAN STATUS: MOBILE.</strong> Current objective: locate whoever thought they could view Josh without Platinum clearance.';
      if (ticker) ticker.textContent = 'DO NOT LOOK OUTSIDE. HE PREFERS SURPRISE.';
    } else if (titleText.includes('Windows Bean Security Alert')) {
      title.textContent = 'BEAN MOBILITY ALERT — SUBJECT IN MOTION';
      if (heading) heading.textContent = 'Bean is no longer at the monitoring station.';
      if (red) red.innerHTML = '<strong>LAST KNOWN STATUS: MOVING WITH PURPOSE.</strong>';
    } else if (titleText.includes('BEAN HAS BEEN NOTIFIED')) {
      title.textContent = 'CRITICAL SYSTEM MESSAGE — BEAN IS IN MOTION';
      if (heading) heading.textContent = 'YOUR ACCESS ATTEMPT HAS BECOME A FIELD MATTER';
      const paragraphs = node.querySelectorAll('.scare-body p');
      if (paragraphs[0]) paragraphs[0].innerHTML = 'Bean personally reviewed the incident, selected <strong>DENY</strong>, stood up, and left the room.';
    } else if (titleText.includes('PLATINUM LICENSE EXPIRED')) {
      title.textContent = 'PLATINUM ENROLLMENT WINDOW MAY BE CLOSING';
      if (heading) heading.textContent = 'Retroactive Platinum enrollment is strongly encouraged.';
      const paragraphs = node.querySelectorAll('.scare-body p');
      if (paragraphs[0]) paragraphs[0].textContent = 'The Institute cannot guarantee enrollment will be processed before Bean arrives.';
      if (red) red.innerHTML = '<strong>ESTIMATED BEAN ARRIVAL: UNCOMFORTABLY SOON</strong>';
    } else if (titleText.includes('Full System Scan')) {
      title.textContent = 'BEAN APPROACH VECTOR — LIVE ESTIMATE';
      if (heading) heading.textContent = 'Calculating Bean closing distance...';
      const paragraphs = node.querySelectorAll('.scare-body p');
      const last = paragraphs[paragraphs.length - 1];
      if (last) last.innerHTML = '<strong>Approach confidence increasing.</strong> Institute route modeling has become emotionally compromised.';
    } else if (titleText.includes('JOSH CAMERA NETWORK AT RISK')) {
      title.textContent = 'PERIMETER EVENT — SOMETHING SMALL IS APPROACHING';
      if (heading) heading.textContent = 'DO NOT INVESTIGATE THE SCRATCHING';
      const paragraphs = node.querySelectorAll('.scare-body p');
      if (paragraphs[0]) paragraphs[0].innerHTML = 'Bean distrust has progressed to <strong>active follow-up</strong>.';
      if (paragraphs[1]) paragraphs[1].textContent = 'Do not ask “who is there?” The Institute already knows.';
    }

    node.querySelectorAll('[data-spawn-more]').forEach((button) => {
      const text = button.textContent || '';
      if (text.includes('REMOVE THREATS')) button.textContent = 'PLEASE CALL BEAN OFF';
      else if (text.includes('CALL BEAN SUPPORT')) button.textContent = 'BEG FOR MERCY';
      else if (text.includes('Remind me later')) button.textContent = 'PRETEND I DID NOT DO THIS';
      else if (text.includes('APPEAL TO BEAN')) button.textContent = 'REQUEST SAFE PASSAGE';
      else if (text.includes('RENEW NOW')) button.textContent = 'BUY PLATINUM BEFORE ARRIVAL';
      else if (text.includes('DIAGNOSE NOW')) button.textContent = 'CHECK THE FRONT WINDOW';
      else if (text.includes('FIX ALL ISSUES')) button.textContent = 'TRY TO DE-ESCALATE BEAN';
      else if (text.includes('QUARANTINE')) button.textContent = 'BARRICADE REVERENCE DEFICIENCY';
    });
  };

  const rewriteAll = () => {
    layer.querySelectorAll('.scare-window:not(.bean-menace-window)').forEach(menaceExistingWindow);
  };

  const clearEscalation = () => {
    escalationTimers.forEach(window.clearTimeout);
    escalationTimers = [];
  };

  const startEscalation = () => {
    clearEscalation();
    escalationRun += 1;
    const run = escalationRun;
    const events = [
      [900, 'BEAN STATUS UPDATE', 'Bean is no longer stationary.', 'The monitoring collar has registered sustained forward movement. Institute analysts insist this is probably unrelated to you.', 'STATUS: MOVING WITH PURPOSE'],
      [2400, 'ROUTE CALCULATION FAILED', 'Estimated arrival: uncomfortably soon.', 'Institute mapping services refuse to display Bean’s route. The route may be ignoring roads.', 'DISTANCE: DECREASING'],
      [4100, 'PERIMETER ADVISORY', 'Do not investigate scratching noises.', 'If you hear movement outside, remain calm. Do not call Bean by name. He already knows why he is there.', 'BEAN: FINAL APPROACH'],
      [5900, 'LAST CHANCE PLATINUM NOTICE', 'This would be a good time to join Platinum.', 'Administrative processing normally takes 3–5 business days. Bean is not currently observing business-day boundaries.', 'RETROACTIVE REVERENCE ADVISED'],
      [7800, 'FINAL BEAN BULLETIN', 'Bean is here.', 'The Institute has exhausted its available guidance. Closing this alert will not make Bean forget the camera request.', 'GOOD LUCK']
    ];

    events.forEach(([delay, title, headline, body, status], index) => {
      escalationTimers.push(window.setTimeout(() => {
        if (run !== escalationRun || !layer.classList.contains('is-active')) return;
        createMenaceWindow(title, headline, body, status, index + 1);
      }, delay));
    });
  };

  const isUplinkActive = () => {
    const status = sequence?.querySelector('strong');
    return Boolean(status && status.textContent.includes('UPLINK ACTIVE'));
  };

  const routeEarlyPlatinumIntoMainFlow = () => {
    if (!platinumButton) return;

    platinumButton.disabled = false;
    if (denialMessage && denialMessage.textContent.includes('Establish uplink')) {
      denialMessage.textContent = 'Platinum enrollment available. Secure uplink will be verified automatically.';
    }

    platinumButton.addEventListener('click', () => {
      if (isUplinkActive() || earlyPlatinumPending) return;
      earlyPlatinumPending = true;

      if (denialMessage) {
        denialMessage.textContent = 'Platinum request received. Verifying sacred-stream uplink before Bean review...';
        denialMessage.classList.add('active');
      }
      platinumButton.textContent = 'Verifying Platinum request...';
      platinumButton.disabled = true;
      connectButton?.click();

      const startedAt = performance.now();
      const waitForUplink = window.setInterval(() => {
        if (isUplinkActive()) {
          window.clearInterval(waitForUplink);
          earlyPlatinumPending = false;
          platinumButton.disabled = false;
          window.setTimeout(() => platinumButton.click(), 120);
          return;
        }

        if (performance.now() - startedAt > 6000) {
          window.clearInterval(waitForUplink);
          earlyPlatinumPending = false;
          platinumButton.disabled = false;
          platinumButton.textContent = 'Join Platinum Tier';
          if (denialMessage) denialMessage.textContent = 'Uplink verification stalled. Bean remains suspicious.';
        }
      }, 80);
    }, true);
  };

  const observer = new MutationObserver(() => {
    rewriteAll();
    if (layer.classList.contains('is-active') && !layer.dataset.menaceActive) {
      layer.dataset.menaceActive = 'true';
      startEscalation();
    } else if (!layer.classList.contains('is-active') && layer.dataset.menaceActive) {
      delete layer.dataset.menaceActive;
      clearEscalation();
    }
  });

  injectStyles();
  routeEarlyPlatinumIntoMainFlow();
  observer.observe(layer, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  rewriteAll();
})();
