/* Alvora AI — local demo: recruiters, applicants, jobs, screenings, outreach */

const STORAGE_USERS = "resumelens_users";
const STORAGE_SESSION = "resumelens_session";
const STORAGE_JOBS = "resumelens_jobs";
const STORAGE_APPS = "resumelens_applications";
const STORAGE_SCREENS = "resumelens_screenings";
const STORAGE_MSG = "resumelens_outreach";

/** Base URL for your backend (no trailing slash). If empty, screening questions are generated locally. */
const AI_SCREENING_API_URL = "";

const SCREEN_SECONDS = 60;

function formatCountdownSeconds(totalSec) {
  const m = Math.floor(Math.max(0, totalSec) / 60);
  const s = Math.max(0, totalSec) % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function formatCountdownFromMs(ms) {
  return formatCountdownSeconds(Math.ceil(Math.max(0, ms) / 1000));
}

function generateLocalScreeningQuestions(job) {
  const title = (job && job.title) || "this role";
  const desc = ((job && job.description) || "").trim().replace(/\s+/g, " ").slice(0, 180);
  const hint = desc ? ` Job context: ${desc}${desc.length >= 180 ? "…" : ""}` : "";
  return [
    `Behavioral: Tell us about a time you handled conflict in a team while working on ${title}.${hint}`,
    `Theoretical: Explain how you would design a reliable solution for a key requirement in ${title}.`,
    `Behavioral: Describe a time you managed multiple deadlines and how you prioritized your work.`,
    `Theoretical: How would you debug a production performance issue step by step?`,
    `Situational: If requirements are unclear in ${title}, how do you move forward without blocking delivery?`,
  ];
}

async function fetchAiScreeningQuestions(job, application, count) {
  const base = typeof AI_SCREENING_API_URL === "string" ? AI_SCREENING_API_URL.trim() : "";
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/screening-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        jobTitle: job.title,
        jobDescription: job.description,
        applicantEmail: application.applicantEmail,
        resumeExcerpt: application.resumeSnapshot,
        count,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.questions)) return null;
    const cleaned = data.questions
      .map((q) => (typeof q === "string" ? q.trim() : ""))
      .filter(Boolean);
    return cleaned.length >= count ? cleaned.slice(0, count) : null;
  } catch {
    return null;
  }
}

async function sendAiQuestionsToApplicants(job, applications, recruiterEmail) {
  const list = getScreens();
  if (!applications.length) {
    return;
  }
  let createdCount = 0;
  let skippedCount = 0;
  for (const application of applications) {
    if (list.some((s) => s.jobId === job.id && s.applicantEmail === application.applicantEmail)) {
      skippedCount++;
      continue;
    }
    const desiredCount = 5;
    let questions = await fetchAiScreeningQuestions(job, application, desiredCount);
    if (!questions) questions = generateLocalScreeningQuestions(job);
    questions.slice(0, desiredCount).forEach((question, idx) => {
      list.push({
        id: uid("sc"),
        jobId: job.id,
        applicantEmail: application.applicantEmail,
        recruiterEmail,
        question: String(question).trim(),
        questionNumber: idx + 1,
        totalQuestions: desiredCount,
        answer: null,
        answeredAt: null,
        recruiterScore: null,
        interviewPick: false,
      });
      createdCount++;
    });
  }
  saveScreens(list);
  if (createdCount) {
    alert(`Sent ${createdCount} AI question(s).`);
  }
  if (skippedCount) {
    alert(`${skippedCount} applicant(s) already had screening questions, so they were skipped.`);
  }
}

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function loadJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function getUsers() {
  return loadJSON(STORAGE_USERS, {});
}

function saveUsers(u) {
  saveJSON(STORAGE_USERS, u);
}

function getJobs() {
  return loadJSON(STORAGE_JOBS, []);
}

function saveJobs(j) {
  saveJSON(STORAGE_JOBS, j);
}

function getApps() {
  return loadJSON(STORAGE_APPS, []);
}

function saveApps(a) {
  saveJSON(STORAGE_APPS, a);
}

function getScreens() {
  return loadJSON(STORAGE_SCREENS, []);
}

function saveScreens(s) {
  saveJSON(STORAGE_SCREENS, s);
}

function getMsgs() {
  return loadJSON(STORAGE_MSG, []);
}

function saveMsgs(m) {
  saveJSON(STORAGE_MSG, m);
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SESSION));
  } catch {
    return null;
  }
}

function setSession(email) {
  localStorage.setItem(STORAGE_SESSION, JSON.stringify({ email }));
}

function clearSession() {
  localStorage.removeItem(STORAGE_SESSION);
}

function currentUser() {
  const s = getSession();
  if (!s || !s.email) return null;
  const u = getUsers()[s.email];
  return u ? { email: s.email, ...u } : null;
}

function esc(s) {
  if (s == null) return "";
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}

// ---------- Auth UI ----------
const tabSignIn = document.getElementById("tabSignIn");
const tabSignUp = document.getElementById("tabSignUp");
const formSignIn = document.getElementById("formSignIn");
const formSignUp = document.getElementById("formSignUp");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");

function showAuthMessage(text, isSuccess) {
  authMessage.textContent = text || "";
  authMessage.classList.toggle("success", !!isSuccess);
  if (!text) authMessage.classList.remove("success");
}

function activateTab(which) {
  const isSignIn = which === "signin";
  tabSignIn.classList.toggle("is-active", isSignIn);
  tabSignUp.classList.toggle("is-active", !isSignIn);
  formSignUp.hidden = isSignIn;
  formSignIn.hidden = !isSignIn;
  authTitle.textContent = isSignIn ? "Welcome back" : "Create your account";
  authSubtitle.textContent = isSignIn ? "Sign in to continue." : "Choose recruiter or applicant, then set your password.";
  showAuthMessage("");
}

tabSignIn.addEventListener("click", () => activateTab("signin"));
tabSignUp.addEventListener("click", () => activateTab("signup"));

formSignUp.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("signUpEmail").value.trim().toLowerCase();
  const pass = document.getElementById("signUpPassword").value;
  const confirm = document.getElementById("signUpConfirm").value;
  const roleEl = document.querySelector('input[name="signUpRole"]:checked');
  const role = roleEl ? roleEl.value : "applicant";

  if (pass !== confirm) {
    showAuthMessage("Passwords do not match.");
    return;
  }
  const users = getUsers();
  if (users[email]) {
    showAuthMessage("Account exists. Sign in instead.");
    return;
  }
  users[email] = { password: pass, role, resumeText: "" };
  saveUsers(users);
  setSession(email);
  showAuthMessage("Account created.", true);
  enterApp(email);
});

formSignIn.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("signInEmail").value.trim().toLowerCase();
  const pass = document.getElementById("signInPassword").value;
  const users = getUsers();
  const user = users[email];
  if (!user || user.password !== pass) {
    showAuthMessage("Invalid email or password.");
    return;
  }
  if (!user.role) {
    user.role = "applicant";
    users[email] = user;
    saveUsers(users);
  }
  setSession(email);
  showAuthMessage("Signed in.", true);
  enterApp(email);
});

// ---------- App shell ----------
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const recruiterView = document.getElementById("recruiterView");
const applicantView = document.getElementById("applicantView");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const roleBadge = document.getElementById("roleBadge");
const signOutBtn = document.getElementById("signOutBtn");

function enterApp(email) {
  const users = getUsers();
  const user = users[email];
  const role = user && user.role === "recruiter" ? "recruiter" : "applicant";

  userEmailDisplay.textContent = email;
  roleBadge.textContent = role === "recruiter" ? "Recruiter" : "Applicant";

  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  recruiterView.classList.toggle("hidden", role !== "recruiter");
  applicantView.classList.toggle("hidden", role !== "applicant");

  if (role === "recruiter") {
    initRecruiterUI(email);
  } else {
    initApplicantUI(email);
  }
}

function exitApp() {
  clearSession();
  stopAnswerTimer();
  appSection.classList.add("hidden");
  authSection.classList.remove("hidden");
  activateTab("signin");
  showAuthMessage("");
}

signOutBtn.addEventListener("click", exitApp);

// ---------- Keyword analysis (shared) ----------
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "as", "is", "are",
  "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "must", "shall", "can", "with", "from", "by",
  "about", "into", "through", "during", "before", "after", "above", "below", "between",
  "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how",
  "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only",
  "own", "same", "so", "than", "too", "very", "just", "also", "now", "our", "your", "their",
  "this", "that", "these", "those", "we", "you", "they", "it", "its", "he", "she", "them",
  "who", "whom", "which", "what", "any", "both", "per", "via", "etc", "eg", "ie", "if", "well",
]);

function extractKeywords(jobText, maxTerms) {
  const words = tokenize(jobText);
  const freq = new Map();
  for (const w of words) {
    if (STOP.has(w) || w.length < 3) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (STOP.has(a) || STOP.has(b)) continue;
    const bg = `${a} ${b}`;
    freq.set(bg, (freq.get(bg) || 0) + 2);
  }
  return [...freq.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, maxTerms)
    .map(([term]) => term);
}

function termInResume(term, resumeLower) {
  if (resumeLower.includes(term)) return true;
  if (!term.includes(" ")) return false;
  return term.split(" ").every((p) => resumeLower.includes(p));
}

function computeMatchScore(resumeText, jobDescription) {
  const resume = (resumeText || "").trim().toLowerCase();
  const job = (jobDescription || "").trim();
  if (!resume || !job) return 0;
  const keywords = extractKeywords(job, 24);
  if (!keywords.length) return 0;
  let matched = 0;
  for (const term of keywords) {
    if (termInResume(term, resume)) matched++;
  }
  return Math.round((matched / keywords.length) * 100);
}

function fullAnalysis(resumeText, jobDescription) {
  const resumeLower = (resumeText || "").trim().toLowerCase();
  const keywords = extractKeywords(jobDescription || "", 24);
  const matched = [];
  const missing = [];
  for (const term of keywords) {
    if (termInResume(term, resumeLower)) matched.push(term);
    else missing.push(term);
  }
  const score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
  return { score, matched, missing, keywords };
}

// ---------- Recruiter ----------
function initRecruiterUI(email) {
  document.querySelectorAll('[data-rec-tab="jobs"]').forEach((b) => b.classList.add("is-active"));
  document.querySelectorAll('[data-rec-tab="pipeline"]').forEach((b) => b.classList.remove("is-active"));
  document.getElementById("recTabJobs").classList.remove("hidden");
  document.getElementById("recTabPipeline").classList.add("hidden");

  document.getElementById("postJobBtn").onclick = () => postJob(email);
  renderRecruiterJobList(email);
  refreshPipelineJobSelect(email);
  document.getElementById("pipelineJobSelect").onchange = () => renderPipelineDetail(email);

  document.querySelectorAll(".subnav-btn[data-rec-tab]").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".subnav-btn[data-rec-tab]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const tab = btn.getAttribute("data-rec-tab");
      document.getElementById("recTabJobs").classList.toggle("hidden", tab !== "jobs");
      document.getElementById("recTabPipeline").classList.toggle("hidden", tab !== "pipeline");
      document.getElementById("recTabInbox").classList.toggle("hidden", tab !== "inbox");
      if (tab === "pipeline") {
        refreshPipelineJobSelect(email);
        renderPipelineDetail(email);
      }
      if (tab === "inbox") renderRecruiterInbox(email);
    };
  });
}

function renderRecruiterInbox(recruiterEmail) {
  const el = document.getElementById("recruiterInboxList");
  const msgs = getMsgs().filter((m) => m.toRecruiter === recruiterEmail);
  msgs.sort((a, b) => b.createdAt - a.createdAt);
  el.innerHTML = msgs.length
    ? msgs
        .map(
          (m) =>
            `<article class="job-card"><p><strong>From:</strong> ${esc(m.fromApplicant)}</p><p>${esc(m.body)}</p><p class="job-meta">${new Date(m.createdAt).toLocaleString()}</p></article>`
        )
        .join("")
    : '<p class="empty-hint">No messages yet. Applicants use your email when they send a note.</p>';
}

function postJob(recruiterEmail) {
  const title = document.getElementById("newJobTitle").value.trim();
  const description = document.getElementById("newJobDesc").value.trim();
  if (!title || !description) {
    alert("Please enter title and description.");
    return;
  }
  const jobs = getJobs();
  jobs.push({
    id: uid("j"),
    recruiterEmail,
    title,
    description,
    createdAt: Date.now(),
  });
  saveJobs(jobs);
  document.getElementById("newJobTitle").value = "";
  document.getElementById("newJobDesc").value = "";
  renderRecruiterJobList(recruiterEmail);
  refreshPipelineJobSelect(recruiterEmail);
}

function renderRecruiterJobList(recruiterEmail) {
  const el = document.getElementById("recruiterJobList");
  const jobs = getJobs().filter((j) => j.recruiterEmail === recruiterEmail);
  if (!jobs.length) {
    el.innerHTML = '<p class="empty-hint">No jobs yet. Post one on the left.</p>';
    return;
  }
  el.innerHTML = jobs
    .map((j) => {
      const apps = getApps().filter((a) => a.jobId === j.id).length;
      return `
      <article class="job-card" data-job-id="${esc(j.id)}">
        <h3>${esc(j.title)}</h3>
        <p class="job-meta">${apps} applicant(s)</p>
        <button type="button" class="btn btn-ghost btn-sm open-pipeline" data-job-id="${esc(j.id)}">Open in shortlist &amp; screening</button>
      </article>`;
    })
    .join("");

  el.querySelectorAll(".open-pipeline").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-job-id");
      document.getElementById("pipelineJobSelect").value = id;
      document.querySelector('[data-rec-tab="pipeline"]').click();
      renderPipelineDetail(recruiterEmail);
    });
  });
}

function refreshPipelineJobSelect(recruiterEmail) {
  const sel = document.getElementById("pipelineJobSelect");
  const jobs = getJobs().filter((j) => j.recruiterEmail === recruiterEmail);
  sel.innerHTML = jobs.length
    ? jobs.map((j) => `<option value="${esc(j.id)}">${esc(j.title)}</option>`).join("")
    : '<option value="">No jobs posted yet</option>';
}

function renderPipelineDetail(recruiterEmail) {
  const wrap = document.getElementById("pipelineJobDetail");
  const jobId = document.getElementById("pipelineJobSelect").value;
  const jobs = getJobs();
  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    wrap.innerHTML = '<p class="empty-hint">Post a job first.</p>';
    return;
  }

  const apps = getApps().filter((a) => a.jobId === jobId);
  const screens = getScreens().filter((s) => s.jobId === jobId);

  let applicantsBlock = "";
  if (!apps.length) {
    applicantsBlock = "<p>No applicants yet.</p>";
  } else {
    applicantsBlock = `
      <table class="data-table">
        <thead><tr><th>Select</th><th>Applicant</th><th>Resume match</th><th>AI screening</th></tr></thead>
        <tbody>
        ${apps
          .map((a) => {
            const questionCount = screens.filter((s) => s.applicantEmail === a.applicantEmail).length;
            return `<tr>
              <td><input type="checkbox" class="pick-screening-app" data-app="${esc(a.id)}" /></td>
              <td>${esc(a.applicantEmail)}</td>
              <td>${a.matchScore}%</td>
              <td><span class="empty-hint" style="display: inline">${questionCount ? `${questionCount} question(s) already sent` : `Ready to send 5 questions (${AI_SCREENING_API_URL ? "AI backend" : "demo generator"})`}</span></td>
            </tr>`;
          })
          .join("")}
        </tbody>
      </table>`;
  }

  const answered = screens.filter((s) => s.answer);
  const topPicks = answered
    .map((s) => {
      const app = apps.find((x) => x.applicantEmail === s.applicantEmail);
      return {
        ...s,
        matchScore: app ? app.matchScore : 0,
        combined: (s.recruiterScore || 0) * 20 + (app ? app.matchScore : 0) * 0.2,
      };
    })
    .sort((a, b) => b.combined - a.combined)
    .slice(0, 3);

  const topBlock =
    answered.length === 0
      ? "<p class=\"empty-hint\">Rate answers below to surface top 2–3 picks for interviews.</p>"
      : `<div class="top-picks"><h3>Top picks for interviews (by rating + match)</h3><ol>
        ${topPicks
          .map(
            (s) =>
              `<li><strong>${esc(s.applicantEmail)}</strong> — score ${s.recruiterScore || "—"}/5, resume match ${esc(String(getApps().find((x) => x.jobId === jobId && x.applicantEmail === s.applicantEmail)?.matchScore || "—"))}%</li>`
          )
          .join("")}
      </ol></div>`;

  const screenRows = screens
    .map((s) => {
      const answeredPart = s.answer
        ? `<p><strong>Answer:</strong> ${esc(s.answer)}</p>
           <label class="inline-rate">Rating (1–5)
             <input type="number" min="1" max="5" class="rate-input" data-screen="${esc(s.id)}" value="${s.recruiterScore || ""}" />
           </label>
           <label class="inline-check"><input type="checkbox" class="pick-input" data-screen="${esc(s.id)}" ${s.interviewPick ? "checked" : ""} /> Shortlist for interview</label>
           <button type="button" class="btn btn-ghost btn-sm save-rate" data-screen="${esc(s.id)}">Save rating</button>`
        : "<p><em>Awaiting answer…</em></p>";
      return `<article class="screen-card">
        <p><strong>${esc(s.applicantEmail)}</strong></p>
        <p><strong>Q:</strong> ${esc(s.question)}</p>
        ${answeredPart}
      </article>`;
    })
    .join("");

  wrap.innerHTML = `
    <h3>${esc(job.title)}</h3>
    <p class="panel-desc job-desc-full">${esc(job.description)}</p>
    ${topBlock}
    <h3 class="h3-spaced">Applicants</h3>
    <p class="panel-desc">Select applicants you like, then send 5 AI questions (behavioral + theoretical). Timer is 1 minute per question.</p>
    ${applicantsBlock}
    ${apps.length ? '<button type="button" class="btn btn-primary" id="sendSelectedQuestionsBtn">Send 5 AI questions to selected applicants</button>' : ""}
    <h3 class="h3-spaced">Screening Q&amp;A</h3>
    <div class="screen-list">${screens.length ? screenRows : "<p>No questions sent yet.</p>"}</div>
  `;

  const sendSelectedQuestionsBtn = wrap.querySelector("#sendSelectedQuestionsBtn");
  if (sendSelectedQuestionsBtn) {
    sendSelectedQuestionsBtn.addEventListener("click", async () => {
      const ids = [...wrap.querySelectorAll(".pick-screening-app:checked")]
        .map((node) => node.getAttribute("data-app"))
        .filter(Boolean);
      if (!ids.length) {
        alert("Select at least one applicant first.");
        return;
      }
      sendSelectedQuestionsBtn.disabled = true;
      try {
        const selectedApps = apps.filter((a) => ids.includes(a.id));
        await sendAiQuestionsToApplicants(job, selectedApps, recruiterEmail);
        renderPipelineDetail(recruiterEmail);
      } finally {
        sendSelectedQuestionsBtn.disabled = false;
      }
    });
  }

  wrap.querySelectorAll(".save-rate").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sid = btn.getAttribute("data-screen");
      const card = btn.closest(".screen-card");
      const num = card && card.querySelector(".rate-input");
      const chk = card && card.querySelector(".pick-input");
      const list = getScreens();
      const row = list.find((x) => x.id === sid);
      if (!row) return;
      const v = num && num.value ? parseInt(num.value, 10) : null;
      row.recruiterScore = v >= 1 && v <= 5 ? v : null;
      row.interviewPick = !!(chk && chk.checked);
      saveScreens(list);
      renderPipelineDetail(recruiterEmail);
    });
  });
}

// ---------- Applicant ----------
const resumeText = document.getElementById("resumeText");
const resumePdfInput = document.getElementById("resumePdfInput");
const resumePdfStatus = document.getElementById("resumePdfStatus");
const resumePdfPreview = document.getElementById("resumePdfPreview");
const jobDesc = document.getElementById("jobDesc");
const scoreRing = document.getElementById("scoreRing");
const scoreValue = document.getElementById("scoreValue");
const matchedList = document.getElementById("matchedList");
const missingList = document.getElementById("missingList");
const insightBox = document.getElementById("insightBox");
const insightText = document.getElementById("insightText");

async function extractTextFromPdfFile(file) {
  if (!file) throw new Error("No file provided.");
  if (!window.pdfjsLib || !window.pdfjsLib.getDocument) {
    throw new Error("pdf.js not loaded.");
  }

  // pdf.js needs the worker to parse PDFs.
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    fullText += strings.join(" ") + "\n";
  }
  return fullText.trim();
}

function initApplicantUI(email) {
  const users = getUsers();
  const u = users[email] || {};
  resumeText.value = u.resumeText || "";
  if (resumePdfPreview) {
    const preview = resumeText.value ? resumeText.value.slice(0, 6000) : "No PDF extracted yet. Upload one to enable scoring.";
    resumePdfPreview.textContent = preview + (resumeText.value && resumeText.value.length > 6000 ? "…" : "");
  }

  document.getElementById("analyzeBtn").onclick = () => runAnalyzer();
  document.getElementById("saveResumeBtn").onclick = () => {
    const all = getUsers();
    const prev = all[email] || {};
    all[email] = { ...prev, resumeText: resumeText.value };
    saveUsers(all);
    alert("Resume saved to your profile.");
    renderApplicantJobs(email);
  };

  const appPanels = {
    analyzer: "appTabAnalyzer",
    jobs: "appTabJobs",
    screenings: "appTabScreenings",
    reachout: "appTabReachout",
  };
  document.querySelectorAll(".subnav-btn[data-app-tab]").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".subnav-btn[data-app-tab]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const tab = btn.getAttribute("data-app-tab");
      Object.values(appPanels).forEach((id) => document.getElementById(id).classList.add("hidden"));
      document.getElementById(appPanels[tab]).classList.remove("hidden");
      if (tab === "jobs") renderApplicantJobs(email);
      if (tab === "screenings") renderPendingScreenings(email);
      if (tab === "reachout") renderReachout(email);
    };
  });

  document.getElementById("sendReachoutBtn").onclick = () => sendReachout(email);

  if (resumePdfInput) {
    resumePdfInput.onchange = async () => {
      const file = resumePdfInput.files && resumePdfInput.files[0];
      if (!file) return;

      const analyzeBtn = document.getElementById("analyzeBtn");
      const saveResumeBtn = document.getElementById("saveResumeBtn");
      resumePdfInput.disabled = true;
      if (analyzeBtn) analyzeBtn.disabled = true;
      if (saveResumeBtn) saveResumeBtn.disabled = true;

      try {
        if (resumePdfStatus) resumePdfStatus.textContent = "Extracting text from PDF…";
        if (resumePdfPreview) resumePdfPreview.textContent = "Extracting…";

        const text = await extractTextFromPdfFile(file);
        resumeText.value = text;
        // Auto-save extracted PDF text so Apply works right away.
        const all = getUsers();
        const prev = all[email] || {};
        all[email] = { ...prev, resumeText: text };
        saveUsers(all);

        if (resumePdfPreview) {
          resumePdfPreview.textContent = text.slice(0, 6000) + (text.length > 6000 ? "…" : "");
        }
        if (resumePdfStatus) resumePdfStatus.textContent = "PDF extracted and saved to your profile.";
        renderApplicantJobs(email);
      } catch (e) {
        if (resumePdfStatus) resumePdfStatus.textContent = "Could not read this PDF. Try another file.";
        if (resumePdfPreview) resumePdfPreview.textContent = "Extraction failed.";
        alert("Failed to extract text from the PDF. Please try another PDF.");
      } finally {
        resumePdfInput.disabled = false;
        if (analyzeBtn) analyzeBtn.disabled = false;
        if (saveResumeBtn) saveResumeBtn.disabled = false;
      }
    };
  }

  renderApplicantJobs(email);
  renderPendingScreenings(email);
  renderReachout(email);
}

function runAnalyzer() {
  const job = jobDesc.value.trim();
  const resume = resumeText.value.trim();
  if (!job || !resume) {
    insightBox.hidden = false;
    if (!resume) {
      insightText.textContent = "Upload your resume PDF to extract its text first.";
      alert("Upload your resume PDF to extract its text first.");
      if (resumePdfInput) resumePdfInput.focus();
    } else {
      insightText.textContent = "Paste a job description to analyze match.";
      alert("Paste a job description to analyze match.");
      if (jobDesc) jobDesc.focus();
    }
    return;
  }
  const { score, matched, missing } = fullAnalysis(resume, job);
  scoreRing.style.setProperty("--score", String(score));
  scoreValue.textContent = score + "%";
  matchedList.textContent = matched.length ? matched.join(", ") : "(none)";
  missingList.textContent = missing.length ? missing.join(", ") : "—";
  insightBox.hidden = false;
  insightText.textContent =
    score >= 70
      ? "Strong overlap with this posting."
      : score >= 40
        ? "Moderate match — consider adding missing keywords where truthful."
        : "Low overlap — tailor your resume or find a closer role.";
}

function renderApplicantJobs(email) {
  const el = document.getElementById("applicantJobList");
  const users = getUsers();
  const resume = (users[email] && users[email].resumeText) || "";
  const jobs = getJobs();
  if (!jobs.length) {
    el.innerHTML = '<p class="empty-hint">No jobs posted yet. Ask a recruiter to sign up and publish a role.</p>';
    return;
  }
  el.innerHTML = jobs
    .map((j) => {
      const match = computeMatchScore(resume, j.description);
      const applied = getApps().some((a) => a.jobId === j.id && a.applicantEmail === email);
      return `
      <article class="job-card">
        <h3>${esc(j.title)}</h3>
        <p class="job-meta">Posted by ${esc(j.recruiterEmail)} · Your match: <strong>${resume ? match + "%" : "save resume first"}</strong></p>
        <p class="job-desc-preview">${esc(j.description.slice(0, 220))}${j.description.length > 220 ? "…" : ""}</p>
        <button type="button" class="btn btn-primary apply-btn" data-job="${esc(j.id)}" ${applied ? "disabled" : ""}>
          ${applied ? "Applied" : "Apply with saved resume"}
        </button>
      </article>`;
    })
    .join("");

  el.querySelectorAll(".apply-btn").forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => {
      const jobId = btn.getAttribute("data-job");
      const u = getUsers()[email];
      const text = (u && u.resumeText) || "";
      if (!text.trim()) {
        alert("Upload your resume PDF and save it to your profile first.");
        return;
      }
      const job = getJobs().find((x) => x.id === jobId);
      if (!job) return;
      const matchScore = computeMatchScore(text, job.description);
      const apps = getApps();
      if (apps.some((a) => a.jobId === jobId && a.applicantEmail === email)) return;
      const newApp = {
        id: uid("a"),
        jobId,
        applicantEmail: email,
        resumeSnapshot: text.slice(0, 2000),
        matchScore,
        appliedAt: Date.now(),
      };
      apps.push(newApp);
      saveApps(apps);
      renderApplicantJobs(email);
    });
  });
}

function renderPendingScreenings(email) {
  const el = document.getElementById("pendingScreeningsList");
  const screens = getScreens().filter((s) => s.applicantEmail === email && !s.answer);
  if (!screens.length) {
    el.innerHTML = '<p class="empty-hint">No open questions. Recruiters will assign screening question sets after reviewing your resume.</p>';
    return;
  }
  const jobs = getJobs();
  el.innerHTML = screens
    .map((s) => {
      const job = jobs.find((j) => j.id === s.jobId);
      return `
      <article class="job-card">
        <p><strong>${esc(job ? job.title : "Job")}</strong> · ${esc(s.recruiterEmail)}</p>
        <p><strong>Question ${esc(String(s.questionNumber || 1))}/${esc(String(s.totalQuestions || 5))}:</strong> ${esc(s.question)}</p>
        <button type="button" class="btn btn-primary open-answer" data-screen="${esc(s.id)}">Answer (1 min timer)</button>
      </article>`;
    })
    .join("");

  el.querySelectorAll(".open-answer").forEach((btn) => {
    btn.addEventListener("click", () => openAnswerModal(btn.getAttribute("data-screen")));
  });
}

const answerModal = document.getElementById("answerModal");
const answerModalQuestion = document.getElementById("answerModalQuestion");
const answerModalText = document.getElementById("answerModalText");
const answerTimer = document.getElementById("answerTimer");
const startScreeningBtn = document.getElementById("startScreeningBtn");
const submitScreeningAnswerBtn = document.getElementById("submitScreeningAnswerBtn");
const answerModalHint = document.getElementById("answerModalHint");

let activeScreeningId = null;
let timerInterval = null;
let deadline = 0;

function stopAnswerTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function openAnswerModal(screeningId) {
  const s = getScreens().find((x) => x.id === screeningId);
  if (!s || s.answer) return;
  activeScreeningId = screeningId;
  deadline = 0;
  answerModalQuestion.textContent = s.question;
  answerModalText.value = "";
  answerModalText.disabled = true;
  startScreeningBtn.classList.remove("hidden");
  submitScreeningAnswerBtn.classList.add("hidden");
  submitScreeningAnswerBtn.disabled = true;
  answerTimer.textContent = formatCountdownSeconds(SCREEN_SECONDS);
  answerModalHint.textContent = "Click Start to begin your 1-minute window.";
  stopAnswerTimer();
  answerModal.classList.remove("hidden");
}

function closeAnswerModal() {
  answerModal.classList.add("hidden");
  stopAnswerTimer();
  activeScreeningId = null;
}

document.querySelectorAll("[data-close-modal]").forEach((n) => {
  n.addEventListener("click", closeAnswerModal);
});

startScreeningBtn.addEventListener("click", () => {
  if (!activeScreeningId) return;
  answerModalText.disabled = false;
  answerModalText.focus();
  startScreeningBtn.classList.add("hidden");
  submitScreeningAnswerBtn.classList.remove("hidden");
  submitScreeningAnswerBtn.disabled = false;
  deadline = Date.now() + SCREEN_SECONDS * 1000;
  stopAnswerTimer();
  timerInterval = setInterval(() => {
    const left = Math.max(0, deadline - Date.now());
    answerTimer.textContent = formatCountdownFromMs(left);
    if (left <= 0) {
      stopAnswerTimer();
      submitScreeningAnswerBtn.disabled = true;
      answerModalText.disabled = true;
      answerModalHint.textContent = "Time is up. You can no longer submit.";
    }
  }, 200);
});

submitScreeningAnswerBtn.addEventListener("click", () => {
  if (!activeScreeningId) return;
  if (!deadline || Date.now() > deadline) {
    alert(deadline ? "Time expired." : "Start the timer first.");
    return;
  }
  const text = answerModalText.value.trim();
  if (!text) {
    alert("Write an answer.");
    return;
  }
  const list = getScreens();
  const row = list.find((x) => x.id === activeScreeningId);
  if (!row || row.answer) return;
  row.answer = text;
  row.answeredAt = Date.now();
  saveScreens(list);
  closeAnswerModal();
  const email = getSession().email;
  renderPendingScreenings(email);
});

function renderReachout(email) {
  const sent = getMsgs().filter((m) => m.fromApplicant === email);
  const el = document.getElementById("reachoutSentList");
  el.innerHTML = sent.length
    ? sent
        .map(
          (m) =>
            `<article class="job-card"><p><strong>To:</strong> ${esc(m.toRecruiter)}</p><p>${esc(m.body)}</p><p class="job-meta">${new Date(m.createdAt).toLocaleString()}</p></article>`
        )
        .join("")
    : '<p class="empty-hint">No messages sent yet.</p>';
}

function sendReachout(email) {
  const to = document.getElementById("reachoutTo").value.trim().toLowerCase();
  const body = document.getElementById("reachoutBody").value.trim();
  if (!to || !body) {
    alert("Enter recruiter email and a message.");
    return;
  }
  const msgs = getMsgs();
  msgs.push({ id: uid("m"), fromApplicant: email, toRecruiter: to, body, createdAt: Date.now() });
  saveMsgs(msgs);
  document.getElementById("reachoutBody").value = "";
  renderReachout(email);
}

// ---------- Session restore ----------
(function initSession() {
  const s = getSession();
  if (s && s.email && getUsers()[s.email]) {
    enterApp(s.email);
  }
})();
