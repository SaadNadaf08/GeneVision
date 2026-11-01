import { state, currentContext } from '../core/state.js';
import { apiPost } from '../core/api.js';
import { escapeHtml, pageHeader, badge, navigate } from '../core/ui.js';

let chat = [];
const examples = [
  'What is a DNA codon?',
  'Explain transcription in simple words.',
  'What changed in my mutation result?',
  'Why does a stop codon matter?'
];
function textToSafeHtml(value) {
  let text = escapeHtml(value || '');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  return text.split('\n').map(line => line.startsWith('- ') ? `<div class="chat-bullet">• ${line.slice(2)}</div>` : line).join('<br>');
}
function renderMessages() {
  if (!chat.length) return `<div class="chat-welcome"><div class="tutor-orb">✦</div><h3>Ask a genetics question.</h3><p>Your tutor can explain concepts and walk through the sequence results currently open in GeneVision.</p><div class="prompt-chips">${examples.map((item,i)=>`<button data-example="${i}">${escapeHtml(item)}</button>`).join('')}</div></div>`;
  return chat.map(item => `<div class="chat-message ${item.role}"><span class="chat-avatar">${item.role==='assistant'?'✦':'YOU'}</span><div><div class="chat-role">${item.role==='assistant'?'GENEVISION TUTOR':'YOU'}</div><div class="chat-bubble">${item.role==='assistant'?textToSafeHtml(item.text):escapeHtml(item.text)}</div></div></div>`).join('');
}
export function render() {
  const context = currentContext();
  const contextLabel = context.gene ? `${context.gene.symbol} · ${context.sequenceLength.toLocaleString()} bp loaded` : 'Synthetic practice sequence loaded';
  return `${pageHeader('MODULE 05 / EDUCATIONAL ASSISTANCE', 'AI Gene Tutor', 'Ask beginner-friendly questions. The tutor can use the current gene and mutation summary as context.', badge(state.aiConfigured ? `Connected · ${state.aiModel || 'AI'}` : 'Key not configured','violet'))}
    <section class="tutor-layout"><div class="tutor-main content-card"><div class="chat-context"><span class="context-icon">◈</span><div><small>ACTIVE LEARNING CONTEXT</small><b>${escapeHtml(contextLabel)}</b><span>${escapeHtml(context.mutation ? `${context.mutation.type}: ${context.mutation.effect || context.mutation.note}` : 'No mutation result selected')}</span></div><button class="button button-quiet" data-nav="mutation">Open Mutation Lab ↗</button></div><div class="chat-scroll" id="chatMessages">${renderMessages()}</div><form id="tutorForm" class="chat-composer"><textarea id="tutorQuestion" placeholder="Ask about DNA, genes, codons, expression, or this simulation…" maxlength="1800" rows="2" ${state.aiConfigured?'':'disabled'}></textarea><div class="composer-bottom"><span>${state.aiConfigured?'AI replies can make mistakes. Check biology-specific claims.':'Set AI_API_KEY in your local .env file, then restart the server.'}</span><button class="button button-primary" id="sendTutor" type="submit" ${state.aiConfigured?'':'disabled'}>Ask tutor <span>↗</span></button></div></form></div><aside class="tutor-sidebar"><article class="content-card tutor-status-card"><span class="tutor-status-icon">✦</span><div class="eyebrow">AI SERVICE</div><h3>${state.aiConfigured?'Ready when you are':'One setup step left'}</h3><p>${state.aiConfigured?'Questions are sent to your configured provider through the local server.':'Add your provider key to .env. The key stays on the server and is never sent to the browser.'}</p><button class="button button-quiet full-button" data-nav="settings">${state.aiConfigured?'Review AI settings':'Open setup guide'} →</button></article><article class="content-card tutor-rules"><div class="eyebrow">WHAT IT CAN DO</div><ul><li>Explain biology in plain words</li><li>Describe the app’s calculated codon result</li><li>Clarify DNA, RNA, genes, and proteins</li></ul><div class="disclaimer-box"><span>!</span><p>Not a medical assistant. It cannot decide whether a real variant is harmful.</p></div></article></aside></section>`;
}
export function mount(root) {
  const messages = root.querySelector('#chatMessages');
  const input = root.querySelector('#tutorQuestion');
  const form = root.querySelector('#tutorForm');
  const ask = async question => {
    if (!question.trim()) return;
    if (!state.aiConfigured) { chat.push({ role:'assistant', text:'The AI service is not configured yet. Add your key to the local .env file and restart the app. See Settings for the exact steps.' }); window.dispatchEvent(new CustomEvent('gv:refresh')); return; }
    chat.push({ role:'user', text:question.trim() });
    window.dispatchEvent(new CustomEvent('gv:refresh'));
    const box = document.getElementById('chatMessages');
    if (box) box.insertAdjacentHTML('beforeend','<div class="chat-message assistant pending"><span class="chat-avatar">✦</span><div><div class="chat-role">GENEVISION TUTOR</div><div class="chat-bubble"><span class="spinner"></span> Thinking through your question…</div></div></div>');
    try {
      const response = await apiPost('/api/ai/chat',{ question:question.trim(), context:{ ...currentContext(), recentConversation:chat.slice(-8).map(({role,text})=>({role,text:text.slice(0,1200)})) } });
      chat.push({ role:'assistant', text:response.answer });
    } catch (error) { chat.push({ role:'assistant', text:`I couldn't answer just now: ${error.message}` }); }
    window.dispatchEvent(new CustomEvent('gv:refresh'));
    const newBox = document.getElementById('chatMessages'); if (newBox) newBox.scrollTop = newBox.scrollHeight;
  };
  form?.addEventListener('submit', event => { event.preventDefault(); const question=input.value; input.value=''; ask(question); });
  root.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click',()=>ask(examples[Number(button.dataset.example)])));
  root.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click',()=>navigate(button.dataset.nav)));
}
