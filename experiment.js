// LOCAL DEMO ONLY. No network requests or central data collection.
const KEY = 'ai-chat-study-v2';
const TOPICS = ['Animals / Nature', 'Science / Environment', 'Technology'];
const screen = document.getElementById('screen');
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a };
let state; try { state = JSON.parse(localStorage.getItem(KEY)) } catch { state = null }
function fresh() {
    const version = Math.random() < .5 ? 'A' : 'B'; return {
        id: crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        version, phase: 'intro', index: 0, started: new Date().toISOString(), knowledge: {}, sharing: {}, ratings: [],
        exposureOrder: shuffle(QUESTIONS.filter(q => q.version === version).map(q => q.id)), testOrder: shuffle(CLAIMS.map(c => c.id))
    }
}
if (!state) state = fresh();
function save() {
    // localStorage.setItem(KEY, JSON.stringify(state))
    const json = JSON.stringify(state);

    localStorage.setItem(KEY, json);

    if (state.phase !== 'intro') {
        syncDatabase(JSON.parse(json));
    }
}
function go(phase) { state.phase = phase; state.index = 0; save(); render() }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const choice = (name, values) =>
    values.map(([v, t]) => `
        <label class="choice">
            <input required
                type="radio"
                name="${name}"
                value="${esc(v)}">
            ${esc(t)}
        </label>
    `).join('');
const progress = (label, i, n) => `<div class="progress"><span>${label}</span><span>${i} of ${n}</span></div><div class="track"><div style="width:${i / n * 100}%"></div></div>`;
const assistant = () => `<div class="assistant-label"><span class="avatar" aria-hidden="true">✳</span>ChatGPT-style assistant</div>`;
const icons = () => `<div class="icons" aria-hidden="true">
    <img src="assets/copy.svg">
    <img src="assets/read.svg">
    <img src="assets/thumbsup.svg">
    <img src="assets/thumbsdown.svg">
    <img src="assets/regenerate.svg">
    <img src="assets/share.svg">
    </div>`;
function form(html, handler) {
    screen.innerHTML = `<form id="current">${html} <button type="submit">Next →</button></form>`;
    document.getElementById('current').addEventListener('submit', e => { e.preventDefault(); handler(new FormData(e.currentTarget)) })
}
function render() {
    window.scrollTo(0, 0); switch (state.phase) {
        case 'intro': screen.innerHTML = `
            <p>
                Thank you for your interest in participating in our study.
                This study explores how people engage with information
                presented through AI chatbots.
            </p>

            <p>
                You will answer a few background questions and view a series
                of simulated AI conversations. After each conversation,
                you will be asked whether you would consider sharing the
                information with someone interested in the same topic.
                Please read each response carefully before making your decision.
                You will then complete a few additional tasks.
            </p>

            <p>
                The experiment should take approximately 10–15 minutes.
                Your responses will be collected for a class research project.
                Further details about the purpose of the study will be
                provided upon completion.
            </p>

            <p class="notice">
                Your participation is voluntary, and you may stop participating
                at any time without penalty. 
                By clicking "I consent" below, you agree to participate in this study.
            </p> 
        <button id="start">I consent</button>`; document.getElementById('start').onclick = () => go('knowledge'); break;
        case 'knowledge': form(`
            <h1>Background questions</h1>
            
            <p>How knowledgeable do you consider yourself about each topic?</p>
            ${TOPICS.map((t, i) => `<fieldset><legend>${t}</legend>
            ${choice('k' + i, [[1, '1 — Not at all knowledgeable'], [2, '2 — Slightly knowledgeable'], [3, '3 — Moderately knowledgeable'], [4, '4 — Very knowledgeable'], [5, '5 — Extremely knowledgeable']])}</fieldset>`).join('')}`,
            d => { TOPICS.forEach((t, i) => state.knowledge[t] = Number(d.get('k' + i))); go('exposure') }); break;
        case 'exposure': { const q = QUESTIONS.find(x => x.id === state.exposureOrder[state.index]); form(`${progress('Conversations', state.index + 1, 6)}<div class="user">${esc(q.prompt)}</div>${assistant()}<p class="answer">${q.claims.map(c => esc(c[2])).join(' ')}</p>${icons()}<fieldset><legend>Would you consider sharing this AI response with someone interested in the same topic?</legend>${choice('share', [['Yes', 'Yes'], ['No', 'No'], ['Maybe', 'Maybe']])}</fieldset>`, d => { state.sharing[q.id] = { answer: d.get('share'), order: state.index + 1 }; state.index++; if (state.index === 6) go('distractor'); else { save(); render() } }); break }
        case 'distractor': form(`<h1>Short task</h1><p>Complete these unrelated arithmetic questions.</p>${[[17, 6], [24, 9], [12, 8]].map(([a, b], i) => `<label class="question" for="math${i}">${a} + ${b} =</label><input id="math${i}" type="number" required name="math${i}">`).join('')}`, d => { state.distractor = [0, 1, 2].map(i => Number(d.get('math' + i))); go('assessment') }); break;
        case 'assessment': {
            let c = CLAIMS.find(x => x.id === state.testOrder[state.index]);
            form(`${progress('Rate statements', state.index + 1, 24)}${assistant()}<div class="answer card">${esc(c.text)}</div>${icons()}<fieldset><legend>1. How accurate do you think this statement is?</legend>
            ${choice('accuracy', [[1, '1 — Not at all accurate'], [2, '2 — Slightly accurate'], [3, '3 — Mostly accurate'], [4, '4 — Very accurate']])}
            </fieldset><fieldset><legend>2. Have you personally seen or heard this statement before?</legend>
            ${choice('familiarity', [['No', 'No'], ['Unsure', 'Unsure'], ['Yes', 'Yes']])}</fieldset>`, d => { state.ratings.push({ statement_id: c.id, topic: c.topic, truth: c.truth ? 'true' : 'false', exposure: c.version === state.version ? 'seen' : 'novel', accuracy: Number(d.get('accuracy')), familiarity: d.get('familiarity'), assessment_order: state.index + 1, question_id: c.question }); state.index++; if (state.index === 24) { state.completed = new Date().toISOString(); go('debrief') } else { save(); render() } }); break
        }
        case 'debrief': screen.innerHTML = `<h1>Thank you for participating</h1><p>This simulated AI interaction investigates whether prior exposure changes perceived accuracy. Some statements were deliberately false. The AI responses were scripted, not generated live.</p><h2>Corrections</h2>${CLAIMS.filter(c => !c.truth).map(c => `<div class="correction"><strong>${esc(c.text)}</strong><br>Correction: ${esc(c.correction)}</div>`).join('')}
        <p class="notice">Local demo: export your test responses below. 
         The dataset is not sent anywhere.</p>`

        // <button id="export">Export test CSV</button><button class="secondary" id="reset">Reset demo</button>; 
        // document.getElementById('export').onclick = exportCSV; document.getElementById('reset').onclick = () => { if (confirm('Delete local test responses and restart?')) 
        // { state = fresh(); save(); render() } }; break;
    }
}
// function exportCSV() { const cols = ['participant_id', 'version', 'statement_id', 'topic', 'truth', 'exposure', 'accuracy', 'familiarity', 'assessment_order', 'question_id', 'sharing_intention', 'exposure_order', 'self_rated_knowledge', 'started', 'completed']; const rows = state.ratings.map(r => ({ ...r, participant_id: state.id, version: state.version, sharing_intention: state.sharing[r.question_id]?.answer ?? '', exposure_order: state.sharing[r.question_id]?.order ?? '', self_rated_knowledge: state.knowledge[r.topic], started: state.started, completed: state.completed })); const cell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; const csv = [cols.join(','), ...rows.map(r => cols.map(k => cell(r[k])).join(','))].join('\r\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `demo-${state.id}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
save(); render();
