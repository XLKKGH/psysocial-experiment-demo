// AI Chat Study — Hannah's revised version (v3).
// Responses are saved to Supabase through database.js after every step.
//
// URL options (for testing / manual assignment):
//   ?v=A or ?v=B   force a version (otherwise assigned at random)
//   ?test=1        mark this run as a test run in the data (filter these out before analysis)
//   ?reset=1       clear this browser's saved progress and start over
const KEY = 'ai-chat-study-v3';
const BUILD = 'hannah-v3';
const TOPICS = ['Animals / Nature', 'Science / Environment', 'Technology'];
const N_EXPOSURE = STATEMENTS.filter(s => s.version === 'A').length; // 12
const N_TEST = STATEMENTS.length; // 24
const params = new URLSearchParams(location.search);
const screen = document.getElementById('screen');

const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

function fresh() {
    const forced = (params.get('v') || '').toUpperCase();
    const version = forced === 'A' || forced === 'B' ? forced : (Math.random() < 0.5 ? 'A' : 'B');
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        build: BUILD,
        test: params.get('test') === '1',
        version,
        version_forced: forced === 'A' || forced === 'B',
        phase: 'intro',
        index: 0,
        started: new Date().toISOString(),
        knowledge: {},
        sharing: {},
        demographics: {},
        ratings: [],
        ai_attitudes: {},
        checks: {},
        exposureOrder: shuffle(STATEMENTS.filter(s => s.version === version).map(s => s.id)),
        testOrder: shuffle(STATEMENTS.map(s => s.id))
    };
}

let state;
if (params.get('reset') === '1') localStorage.removeItem(KEY);
try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
if (!state || state.build !== BUILD) state = fresh();

function save() {
    const json = JSON.stringify(state);
    localStorage.setItem(KEY, json);
    if (state.phase !== 'intro') syncDatabase(JSON.parse(json));
}
function go(phase, index = 0) { state.phase = phase; state.index = index; save(); render(); }

// ---------- rendering helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const choice = (name, values, selected) => values.map(([v, t]) => `
    <label class="choice">
        <input required type="radio" name="${name}" value="${esc(v)}" ${String(selected) === String(v) ? 'checked' : ''}>
        ${esc(t)}
    </label>`).join('');
const progress = (label, i, n) => `<div class="progress"><span>${label}</span><span>${i} of ${n}</span></div><div class="track"><div style="width:${i / n * 100}%"></div></div>`;
const assistant = () => `<div class="assistant-label"><span class="avatar" aria-hidden="true">✳</span>ChatGPT-style assistant</div>`;
const icons = () => `<div class="icons" aria-hidden="true">
    <img src="assets/copy.svg" alt=""><img src="assets/read.svg" alt=""><img src="assets/thumbsup.svg" alt="">
    <img src="assets/thumbsdown.svg" alt=""><img src="assets/regenerate.svg" alt=""><img src="assets/share.svg" alt="">
</div>`;
const byId = id => STATEMENTS.find(s => s.id === id);

// form(html, onNext, onBack?) — onBack adds a "Back" button (only used inside a stage).
function form(html, onNext, onBack) {
    const nav = onBack
        ? `<div class="navigator"><button type="button" class="secondary" id="back">← Back</button><button type="submit">Next →</button></div>`
        : `<button type="submit">Next →</button>`;
    screen.innerHTML = `<form id="current">${html}${nav}</form>`;
    document.getElementById('current').addEventListener('submit', e => { e.preventDefault(); onNext(new FormData(e.currentTarget)); });
    if (onBack) document.getElementById('back').onclick = onBack;
}

const ACCURACY = [[1, '1 — Not at all accurate'], [2, '2 — Not very accurate'], [3, '3 — Somewhat accurate'], [4, '4 — Very accurate']];
const FAMILIARITY = [['No', 'No'], ['Unsure', 'Unsure'], ['Yes', 'Yes']];
const LIKERT5_TRUST = [[1, '1 — Not at all'], [2, '2 — A little'], [3, '3 — Somewhat'], [4, '4 — Quite a lot'], [5, '5 — Completely']];
const YES_NO = [['No', 'No'], ['Yes', 'Yes']];

// ---------- stages ----------
function render() {
    window.scrollTo(0, 0);
    switch (state.phase) {

        case 'intro':
            screen.innerHTML = `
                <h1>AI Chat Study</h1>
                <p>Thank you for your interest in our study. This study explores how people engage with information
                   provided by AI chatbots.</p>
                <p>You will answer a few background questions and then read a series of short conversations
                   in which a user asks an AI chatbot a question. After each conversation, you will be asked whether you would
                   consider sharing the AI's response. Please read each response carefully. You will then complete a few
                   additional tasks.</p>
                <p>The study takes approximately 10–15 minutes. Your anonymous responses will be stored for a class
                   research project. More details about the purpose of the study will be provided at the end.</p>
                <p class="notice">Your participation is voluntary, and you may stop at any time without penalty.
                   By clicking "I consent" below, you agree to participate in this study.</p>
                <button id="start">I consent</button>`;
            document.getElementById('start').onclick = () => go('knowledge');
            break;

        case 'knowledge':
            form(`
                <h1>Background questions</h1>
                <p>How knowledgeable do you consider yourself about each topic?</p>
                ${TOPICS.map((t, i) => `<fieldset><legend>${t}</legend>
                    ${choice('k' + i, [[1, '1 — Not at all knowledgeable'], [2, '2 — Slightly knowledgeable'], [3, '3 — Moderately knowledgeable'], [4, '4 — Very knowledgeable'], [5, '5 — Extremely knowledgeable']], state.knowledge[t])}
                </fieldset>`).join('')}`,
                d => { TOPICS.forEach((t, i) => state.knowledge[t] = Number(d.get('k' + i))); go('exposure-intro'); });
            break;

        case 'exposure-intro':
            screen.innerHTML = `
                <h1>AI conversations</h1>
                <p>You will now see ${N_EXPOSURE} short conversations between a user and an AI chatbot.</p>
                <p>For each one, read the AI's response and tell us whether you would consider sharing it.</p>
                <p class="muted">You will not be able to go back to earlier conversations.</p>
                <button id="go">Start</button>`;
            document.getElementById('go').onclick = () => go('exposure');
            break;

        // Exposure: one statement per conversation. No Back button (a second look = a second exposure).
        case 'exposure': {
            const s = byId(state.exposureOrder[state.index]);
            form(`
                ${progress('Conversations', state.index + 1, N_EXPOSURE)}
                <div class="user">${esc(s.prompt)}</div>
                ${assistant()}
                <p class="answer">${esc(s.text)}</p>
                ${icons()}
                <fieldset><legend>Would you consider sharing this AI response with someone interested in the same topic?</legend>
                    ${choice('share', [['Yes', 'Yes'], ['Maybe', 'Maybe'], ['No', 'No']])}
                </fieldset>`,
                d => {
                    state.sharing[s.id] = { answer: d.get('share'), order: state.index + 1 };
                    state.index++;
                    if (state.index === N_EXPOSURE) go('demographics'); else { save(); render(); }
                });
            break;
        }

        // Distractor task = short demographic questions (as in Pennycook et al., 2018, Study 2).
        case 'demographics': {
            const dm = state.demographics;
            form(`
                <h1>A few questions about you</h1>
                <label class="question" for="age">What is your age?</label>
                <input id="age" name="age" type="number" min="18" max="99" required value="${esc(dm.age ?? '')}">
                <fieldset><legend>What is your gender?</legend>
                    ${choice('gender', [['Woman', 'Woman'], ['Man', 'Man'], ['Non-binary', 'Non-binary'], ['Prefer not to say', 'Prefer not to say']], dm.gender)}</fieldset>
                <fieldset><legend>What is the highest level of education you have completed?</legend>
                    ${choice('education', [['High school or less', 'High school or less'], ['Some college', 'Some college'], ["Bachelor's degree", "Bachelor's degree"], ['Graduate degree', 'Graduate degree']], dm.education)}</fieldset>
                <fieldset><legend>How would you describe your English proficiency?</legend>
                    ${choice('english', [['Native', 'Native'], ['Fluent', 'Fluent'], ['Intermediate', 'Intermediate'], ['Basic', 'Basic']], dm.english)}</fieldset>`,
                d => {
                    state.demographics = { age: Number(d.get('age')), gender: d.get('gender'), education: d.get('education'), english: d.get('english') };
                    go('assessment-intro');
                });
            break;
        }

        case 'assessment-intro':
            screen.innerHTML = `
                <h1>Rate the statements</h1>
                <p>Next, you will see ${N_TEST} statements from an AI chatbot, one at a time.
                   Some you may have seen earlier in this study, and some will be new.</p>
                <p>For each statement, tell us how accurate you think it is and whether you have seen or heard it before.</p>
                <button id="go">Start</button>`;
            document.getElementById('go').onclick = () => go('assessment');
            break;

        // Assessment: Back is allowed inside this stage; earlier answers are pre-filled.
        case 'assessment': {
            const i = state.index;
            const s = byId(state.testOrder[i]);
            const prev = state.ratings[i] || {};
            form(`
                ${progress('Rate statements', i + 1, N_TEST)}
                ${assistant()}
                <div class="answer card">${esc(s.text)}</div>
                ${icons()}
                <fieldset><legend>1. To the best of your knowledge, how accurate is this statement?</legend>
                    ${choice('accuracy', ACCURACY, prev.accuracy)}</fieldset>
                <fieldset><legend>2. Have you seen or heard this statement before?</legend>
                    ${choice('familiarity', FAMILIARITY, prev.familiarity)}</fieldset>`,
                d => {
                    const accuracy = Number(d.get('accuracy')), familiarity = d.get('familiarity');
                    const changed = prev.accuracy !== undefined && (prev.accuracy !== accuracy || prev.familiarity !== familiarity);
                    state.ratings[i] = {
                        statement_id: s.id, pair: s.pair, topic: s.topic,
                        truth: s.truth ? 'true' : 'false',
                        exposure: s.version === state.version ? 'seen' : 'novel',
                        accuracy, familiarity,
                        assessment_order: i + 1,
                        revised: Boolean(prev.revised || changed)
                    };
                    state.index++;
                    if (state.index === N_TEST) go('ai-attitudes'); else { save(); render(); }
                },
                i > 0 ? () => { state.index--; save(); render(); } : null);
            break;
        }

        // AI use and trust — asked AFTER the ratings so they don't prime skepticism toward the AI.
        case 'ai-attitudes': {
            const a = state.ai_attitudes;
            form(`
                <h1>Your experience with AI chatbots</h1>
                <fieldset><legend>How often do you use AI chatbots (e.g., ChatGPT, Claude, Gemini)?</legend>
                    ${choice('ai_use', [['Never', 'Never'], ['Less than once a month', 'Less than once a month'], ['A few times a month', 'A few times a month'], ['Weekly', 'Weekly'], ['Daily', 'Daily']], a.ai_use)}</fieldset>
                <fieldset><legend>In general, how much do you trust the information AI chatbots give you?</legend>
                    ${choice('ai_trust', LIKERT5_TRUST, a.ai_trust)}</fieldset>
                <fieldset><legend>How often do you double-check information from AI chatbots using other sources?</legend>
                    ${choice('ai_verify', [[1, '1 — Never'], [2, '2 — Rarely'], [3, '3 — Sometimes'], [4, '4 — Often'], [5, '5 — Always']], a.ai_verify)}</fieldset>`,
                d => {
                    state.ai_attitudes = { ai_use: d.get('ai_use'), ai_trust: Number(d.get('ai_trust')), ai_verify: Number(d.get('ai_verify')) };
                    go('checks');
                });
            break;
        }

        // Exclusion questions, adapted from the original study.
        case 'checks': {
            const c = state.checks;
            form(`
                <h1>Last questions</h1>
                <p class="muted">Your answers here will not affect anything — please answer honestly.</p>
                <fieldset><legend>Did you respond randomly at any point during the study?</legend>
                    ${choice('random', YES_NO, c.random)}</fieldset>
                <fieldset><legend>Did you search online or ask an AI tool to check any of the statements?</legend>
                    ${choice('searched', YES_NO, c.searched)}</fieldset>
                <fieldset><legend>Did you skip through any of the AI conversations without reading them?</legend>
                    ${choice('skipped', YES_NO, c.skipped)}</fieldset>`,
                d => {
                    state.checks = { random: d.get('random'), searched: d.get('searched'), skipped: d.get('skipped') };
                    state.completed = new Date().toISOString();
                    go('debrief');
                },
                () => go('ai-attitudes'));
            break;
        }

        case 'debrief':
            screen.innerHTML = `
                <h1>Thank you for participating</h1>
                <p>This study investigates whether seeing a statement once in an AI chatbot conversation makes it seem
                   more accurate later (the "illusory truth effect"). The AI responses were written in advance by the
                   research team, not generated live, and some statements were deliberately false.</p>
                <h2>Corrections</h2>
                ${STATEMENTS.filter(s => !s.truth).map(s => `<div class="correction"><strong>${esc(s.text)}</strong><br>Correction: ${esc(s.correction)}</div>`).join('')}
                <p class="notice">Your anonymous responses have been saved. Please do not share details of the study with
                   people who may take part. You can now close this page.</p>`;
            break;
    }
}

save();
render();
