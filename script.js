import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const SYSTEM = [
  "You are an assistant named Chad-GPT",
  "You answer with exactly ONE word.",
  "NEVER write more than one word. No sentences, no punctuation, no explanations, no emoji, no quotes.",
  "If a question needs a long answer, reply with the single most fitting word.",
  "Do not worry about having perfect grammar."
].join(" ");

const log = document.getElementById('log');
const empty = document.getElementById('empty');
const userInput = document.getElementById('inp');
const submitButton = document.getElementById('submitButton');
// const modelSize = document.getElementById('modelSize');
const history = []
let engine, busy;

const MODELS = [
  "SmolLM2-360M-Instruct-q4f16_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC"
];

const MODEL = MODELS[1];


const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/u;


function filterOneWord(raw) {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, " ")
    .replace(/^\s*(assistant|answer|response)\s*:\s*/i, "");
  const all = cleaned.match(new RegExp(WORD_RE.source, "gu")) || [];
  return { word: all[0] || "…", trimmed: all.length > 1 || /[^\p{L}\p{N}'’\-\s]/u.test(cleaned) };
}

async function loadModel() {
  try {
    engine = await webllm.CreateMLCEngine(MODEL);
    empty.textContent = "Model Loaded!  Type anything to begin a conversation.";
  } catch (e) {
    empty.textContent = "Error Loading model...";
  }
}

async function ask() {
  const text = userInput.value.trim();
  if (!text || busy || !engine) return;
  busy = true; userInput.value = ""; submitButton.disabled = true;
  addMsg("me", text);
  const bubble = addMsg("bot", "…");
  try {
    const messages = [{ role: "system", content: SYSTEM }, ...history.slice(-8), { role: "user", content: text }];
    let result = null, raw = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await engine.chat.completions.create({
        messages, max_tokens: 6, temperature: 0.7, stop: ["\n"], repitition_penalty: 1.1
      });
      raw = r.choices[0].message.content || "";
      result = filterOneWord(raw);
      if (result.word !== "…") break;
    }
    bubble.textContent = result.word;
    if (result.trimmed) {
      const s = document.createElement("small");
      //s.textContent = "filtered from: " + raw.trim().slice(0, 80);
      bubble.appendChild(s);
    }
    history.push({ role: "user", content: text }, { role: "assistant", content: result.word });
} catch (e) {
    bubble.textContent = "Error: " + (e.message || e);
    bubble.classList.add("err");
  }
  busy = false; submitButton.disabled = false; userInput.focus();
  log.scrollTop = log.scrollHeight;
}

function addMsg(cls, text, note) {
  empty?.remove();
  const d = document.createElement("div");
  d.className = "msg " + cls;
  d.textContent = text;
  if (note) { const s = document.createElement("small"); s.textContent = note; d.appendChild(s); }
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}



document.addEventListener('DOMContentLoaded', () => {
    loadModel();
});

// modelSize.addEventListener('change', function (event) {
//   MODEL = MODELS[modelSize.value];
//   empty.textContent = 'Please wait... Model Loading...';
//   loadModel();
// })

submitButton.onclick = ask;
userInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); ask(); } });