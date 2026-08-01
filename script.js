// ---------- CONFIG ----------
// Nach dem Deployen des Cloudflare Workers hier dessen URL eintragen (siehe README, Schritt 3)
const RSVP_ENDPOINT_URL = "https://bryllup-rsvp.philippherpich.workers.dev/";

// ---------- Modal-Steuerung ----------
const infoOverlay = document.getElementById('info-overlay');
const infoBody = document.getElementById('info-body');
const infoStamp = document.getElementById('info-stamp');
const rsvpOverlay = document.getElementById('rsvp-overlay');

const stamps = {
  us: "Willkommen",
  travel: "Anreise",
  ceremony: "Zeremonie & Dinner",
  stay: "Uebernachten",
  afterparty: "Afterparty"
};

function openInfo(key){
  const tpl = document.getElementById(`content-${key}`);
  if (!tpl) return;
  infoBody.innerHTML = '';
  infoBody.appendChild(tpl.content.cloneNode(true));
  infoStamp.textContent = stamps[key] || '';
  infoOverlay.hidden = false;
}

function openRsvp(){
  rsvpOverlay.hidden = false;
}

function closeAll(){
  infoOverlay.hidden = true;
  rsvpOverlay.hidden = true;
}

// Klick auf ein Objekt
document.querySelectorAll('[data-open]').forEach(el => {
  el.addEventListener('click', () => {
    const key = el.dataset.open;
    if (key === 'rsvp') openRsvp();
    else openInfo(key);
  });
});

// ---------- Play/Pause: "March of the Trolls" ----------
const trollBtn = document.getElementById('troll-audio-btn');
const trollAudio = document.getElementById('troll-audio');
const iconPlay = trollBtn.querySelector('.icon-play');
const iconPause = trollBtn.querySelector('.icon-pause');
function setPlayingState(isPlaying){
  trollBtn.classList.toggle('is-playing', isPlaying);
  trollBtn.setAttribute('aria-pressed', String(isPlaying));
  iconPlay.hidden = isPlaying;
  iconPause.hidden = !isPlaying;
}
trollBtn.addEventListener('click', () => {
  if (trollAudio.paused) {
    trollAudio.play();
    setPlayingState(true);
  } else {
    trollAudio.pause();
    setPlayingState(false);
  }
});
trollAudio.addEventListener('play', () => setPlayingState(true));
trollAudio.addEventListener('pause', () => setPlayingState(false));

// Schliessen: X-Button, Klick auf Overlay, Escape
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', closeAll));
[infoOverlay, rsvpOverlay].forEach(ov => {
  ov.addEventListener('click', (e) => { if (e.target === ov) closeAll(); });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAll();
});

// ---------- RSVP: Ja/Nein steuert sichtbare Felder ----------
const detailFields = document.getElementById('rsvp-details');
const kidsNote = document.getElementById('kids-note');
function updateDetailVisibility(){
  const attending = document.querySelector('input[name="attending"]:checked').value;
  const isAttending = attending === 'yes';
  detailFields.style.display = isAttending ? 'grid' : 'none';
  kidsNote.style.display = isAttending ? '' : 'none';
}
document.querySelectorAll('input[name="attending"]').forEach(r =>
  r.addEventListener('change', updateDetailVisibility));
updateDetailVisibility();

// ---------- RSVP: Essenswunsch muss aktiv gewaehlt werden (kein Default) ----------
const foodSelect = document.querySelector('select[name="food"]');
foodSelect.value = ""; // ueberschreibt evtl. vom Browser wiederhergestellten Wert
foodSelect.addEventListener('invalid', () => {
  foodSelect.setCustomValidity('Please choose one of the dietary options to proceed.');
});
foodSelect.addEventListener('change', () => foodSelect.setCustomValidity(''));

// ---------- RSVP: mindestens ein Event-Haekchen erforderlich (nur wenn sichtbar) ----------
const eventCheckboxes = document.querySelectorAll('input[name="events"]');
function updateEventsRequired(){
  const anyChecked = Array.from(eventCheckboxes).some(cb => cb.checked);
  eventCheckboxes.forEach(cb => {
    cb.required = !anyChecked;
    cb.setCustomValidity('');
  });
}
eventCheckboxes.forEach(cb => {
  cb.addEventListener('change', updateEventsRequired);
  cb.addEventListener('invalid', () => {
    cb.setCustomValidity('Please select at least one of the options to proceed.');
  });
});
updateEventsRequired();

// ---------- RSVP absenden ----------
const form = document.getElementById('rsvp-form');
const status = document.getElementById('form-status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const data = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key);
    data[key] = values.length > 1 ? values : values[0];
  }
  data.timestamp = new Date().toISOString();

  if (!RSVP_ENDPOINT_URL) {
    status.textContent = "The form isn't connected yet (see README, Schritt 3).";
    console.log("RSVP data (local only, not sent):", data);
    return;
  }

  status.textContent = "Sending ...";
  try {
    const response = await fetch(RSVP_ENDPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`status ${response.status}: ${detail}`);
    }
    status.textContent = "Thank you! Your reply has reached us.";
    form.reset();
    updateDetailVisibility();
  } catch (err) {
    console.error(err);
    status.textContent = "Hmm, that didn't work. Feel free to message us directly instead.";
  }
});
