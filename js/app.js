/**
 * REAP Community Ideas – Main Application
 *
 * Data flow:
 *   - IDEAS are stored in localStorage (will be replaced with Power Automate API)
 *   - VOTES are tracked in localStorage per browser fingerprint
 *   - Config.API_BASE can be pointed to Power Automate HTTP trigger URLs
 */

// ── Configuration ──────────────────────────────────────────────
const Config = {
    // Replace these with your Power Automate HTTP trigger URLs once created
    API_BASE: null, // e.g. 'https://prod-xx.westus.logic.azure.com:443/workflows/...'
    ENDPOINTS: {
        GET_IDEAS: 'https://f850afab6a60e2719d9ab2b2dfc20a.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/85c2ccc3c8284161af9b7b51e7d67e6c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=kBtV970Q0DY4uLzLDeHmYsf4zO8d42s5HyxGlMNAqo0',
        POST_IDEA: 'https://f850afab6a60e2719d9ab2b2dfc20a.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8f0d30da20e54ae5a473ebc214412da0/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=iUqF77zxSSTChO1LCQlOweJ3bCgJNftF1E4hdzT6PMI',
        POST_VOTE: 'https://f850afab6a60e2719d9ab2b2dfc20a.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/43d424c296834e92ad1a33c45055aa6e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ET9eJf5eBZUcuvQah-Z1l5d9VH0nHxN04inT_TVNbWw'
    },
    STORAGE_KEYS: {
        IDEAS: 'reap_ideas',
        VOTES: 'reap_votes'
    }
};

// ── State ──────────────────────────────────────────────────────
let currentSort = 'hot';
let allIdeas = [];
let votedIds = new Set();
let fingerprint = null;

// ── Initialization ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Generate fingerprint
    fingerprint = await Fingerprint.generate();

    // Load voted IDs from localStorage
    const stored = localStorage.getItem(Config.STORAGE_KEYS.VOTES);
    if (stored) {
        try { votedIds = new Set(JSON.parse(stored)); } catch { votedIds = new Set(); }
    }

    // Load ideas
    await loadIdeas();
});

// ── Data Loading ───────────────────────────────────────────────
async function loadIdeas() {
    if (Config.ENDPOINTS.GET_IDEAS) {
        try {
            const params = new URLSearchParams({ sort: currentSort });
            const modelFilter = document.getElementById('modelFilter').value;
            const typeFilter = document.getElementById('typeFilter').value;
            if (modelFilter !== 'all') params.set('model', modelFilter);
            if (typeFilter !== 'all') params.set('type', typeFilter);

            const res = await fetch(`${Config.ENDPOINTS.GET_IDEAS}?${params}`);
            allIdeas = await res.json();
        } catch {
            showToast('Failed to load ideas. Using local data.', 'error');
            allIdeas = getLocalIdeas();
        }
    } else {
        allIdeas = getLocalIdeas();
    }
    renderIdeas();
}

function getLocalIdeas() {
    const stored = localStorage.getItem(Config.STORAGE_KEYS.IDEAS);
    if (stored) {
        try { return JSON.parse(stored); } catch { return getSeedIdeas(); }
    }
    // First visit: seed with example ideas
    const seeds = getSeedIdeas();
    localStorage.setItem(Config.STORAGE_KEYS.IDEAS, JSON.stringify(seeds));
    return seeds;
}

function getSeedIdeas() {
    return [
        {
            id: 1,
            title: "Support for batch processing multiple videos simultaneously",
            description: "Currently MMCTAgent processes videos one at a time. It would be great to support batch ingestion and parallel reasoning across multiple video files, especially for large media libraries. This would significantly speed up analysis workflows for organizations with extensive video archives.",
            model: "MMCTAgent",
            feedbackType: "Feature Request",
            status: "NEW",
            voteCount: 24,
            submittedBy: "Community Member",
            submittedDate: "2026-03-10T14:30:00Z"
        },
        {
            id: 2,
            title: "Add Luganda and Amharic to Paza language support",
            description: "Paza currently supports 6 Kenyan languages. Expanding to include Luganda (Uganda) and Amharic (Ethiopia) would help reach more communities in East Africa. Both languages have growing digital presence but limited ASR support.",
            model: "Paza",
            feedbackType: "Feature Request",
            status: "UNDER REVIEW",
            voteCount: 18,
            submittedBy: "Language Researcher",
            submittedDate: "2026-03-08T09:15:00Z"
        },
        {
            id: 3,
            title: "VideoAgent fails on videos longer than 4 hours",
            description: "When processing videos exceeding 4 hours in length, the VideoAgent times out during the ingestion phase. The key-frame extraction step appears to consume excessive memory. Tested with meeting recordings and lecture captures.",
            model: "MMCTAgent",
            feedbackType: "Bug Report",
            status: "NEW",
            voteCount: 31,
            submittedBy: "Enterprise User",
            submittedDate: "2026-03-12T16:45:00Z"
        },
        {
            id: 4,
            title: "Improve Paza-Whisper accuracy for code-switched Swahili-English",
            description: "In real-world Kenyan conversations, speakers frequently switch between Swahili and English mid-sentence. The current Paza-Whisper model struggles with these transitions, producing garbled output at language boundaries. This is very common in agricultural advisory calls.",
            model: "Paza",
            feedbackType: "Bug Report",
            status: "IN PROGRESS",
            voteCount: 42,
            submittedBy: "Digital Green Field Team",
            submittedDate: "2026-03-05T11:20:00Z"
        },
        {
            id: 5,
            title: "Documentation for custom tool integration with ImageAgent",
            description: "The MMCTAgent blog mentions that developers can integrate domain-specific tools like medical image analyzers. However, there's no step-by-step guide or API documentation for registering custom tools with ImageQnATools. A developer guide with examples would be very helpful.",
            model: "MMCTAgent",
            feedbackType: "Documentation",
            status: "NEW",
            voteCount: 15,
            submittedBy: "Developer",
            submittedDate: "2026-03-11T08:00:00Z"
        },
        {
            id: 6,
            title: "How to fine-tune Paza models on our own language data?",
            description: "We have a small dataset (~50 hours) of transcribed audio in a local Nigerian language. Is there a recommended pipeline or playbook for fine-tuning a Paza model on custom data? What's the minimum data requirement?",
            model: "Paza",
            feedbackType: "Question",
            status: "NEW",
            voteCount: 27,
            submittedBy: "NLP Researcher, Nigeria",
            submittedDate: "2026-03-09T13:10:00Z"
        }
    ];
}

// ── Rendering ──────────────────────────────────────────────────
function renderIdeas() {
    const modelFilter = document.getElementById('modelFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;

    let filtered = allIdeas.filter(idea => {
        if (modelFilter !== 'all' && idea.model !== modelFilter) return false;
        if (typeFilter !== 'all' && idea.feedbackType !== typeFilter) return false;
        return true;
    });

    // Sort
    filtered = sortIdeas(filtered, currentSort);

    const list = document.getElementById('ideasList');
    const empty = document.getElementById('emptyState');

    if (filtered.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    list.style.display = 'flex';
    empty.style.display = 'none';

    list.innerHTML = filtered.map(idea => createIdeaCard(idea)).join('');
}

function sortIdeas(ideas, sort) {
    const now = Date.now();
    switch (sort) {
        case 'hot':
            return [...ideas].sort((a, b) => {
                const ageA = (now - new Date(a.submittedDate).getTime()) / 3600000;
                const ageB = (now - new Date(b.submittedDate).getTime()) / 3600000;
                const scoreA = a.voteCount / Math.pow(ageA + 2, 1.5);
                const scoreB = b.voteCount / Math.pow(ageB + 2, 1.5);
                return scoreB - scoreA;
            });
        case 'top':
            return [...ideas].sort((a, b) => b.voteCount - a.voteCount);
        case 'new':
            return [...ideas].sort((a, b) =>
                new Date(b.submittedDate) - new Date(a.submittedDate)
            );
        default:
            return ideas;
    }
}

function createIdeaCard(idea) {
    const isVoted = votedIds.has(idea.id);
    const badgeClass = idea.model === 'MMCTAgent' ? 'badge-mmctagent' : 'badge-paza';
    const statusClass = 'status-' + idea.status.toLowerCase().replace(/\s+/g, '-');
    const timeAgo = getTimeAgo(idea.submittedDate);

    return `
        <div class="idea-card" data-id="${idea.id}">
            <div class="vote-section">
                <button class="vote-btn ${isVoted ? 'voted' : ''}"
                        onclick="vote(${idea.id})"
                        ${isVoted ? 'disabled' : ''}
                        title="${isVoted ? 'Already voted' : 'Vote for this idea'}">
                    <span class="vote-arrow"></span>
                    <span class="vote-count">${idea.voteCount}</span>
                </button>
                <span class="vote-label">${isVoted ? 'Voted' : 'Vote'}</span>
            </div>
            <div class="idea-content">
                <div class="idea-title">${escapeHtml(idea.title)}</div>
                <div class="idea-description">${escapeHtml(idea.description)}</div>
                <div class="idea-meta">
                    <span class="model-badge ${badgeClass}">${escapeHtml(idea.model)}</span>
                    <span class="type-tag">${escapeHtml(idea.feedbackType)}</span>
                    <span class="status-badge ${statusClass}">${escapeHtml(idea.status)}</span>
                    ${idea.submittedBy ? `<span class="idea-author">by ${escapeHtml(idea.submittedBy)}</span>` : ''}
                    <span class="idea-time">${timeAgo}</span>
                </div>
            </div>
        </div>
    `;
}

// ── Voting ─────────────────────────────────────────────────────
async function vote(ideaId) {
    if (votedIds.has(ideaId)) return;

    if (Config.ENDPOINTS.POST_VOTE) {
        try {
            await fetch(Config.ENDPOINTS.POST_VOTE, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ ideaId, fingerprint })
            });
        } catch {
            showToast('Vote failed. Please try again.', 'error');
            return;
        }
    }

    // Update local state
    votedIds.add(ideaId);
    saveVotes();

    const idea = allIdeas.find(i => i.id === ideaId);
    if (idea) {
        idea.voteCount++;
        saveIdeasLocally();
    }

    renderIdeas();
    showToast('Vote recorded!', 'success');
}

function saveVotes() {
    localStorage.setItem(Config.STORAGE_KEYS.VOTES, JSON.stringify([...votedIds]));
}

function saveIdeasLocally() {
    localStorage.setItem(Config.STORAGE_KEYS.IDEAS, JSON.stringify(allIdeas));
}

// ── Submit Idea ────────────────────────────────────────────────
function openSubmitModal() {
    document.getElementById('submitModal').style.display = 'flex';
    document.getElementById('ideaTitle').focus();
}

function closeSubmitModal() {
    document.getElementById('submitModal').style.display = 'none';
    document.getElementById('ideaForm').reset();
}

async function submitIdea(e) {
    e.preventDefault();

    const title = document.getElementById('ideaTitle').value.trim();
    const description = document.getElementById('ideaDescription').value.trim();
    const model = document.getElementById('ideaModel').value;
    const feedbackType = document.getElementById('ideaType').value;
    const author = document.getElementById('ideaAuthor').value.trim();

    if (!title || !description || !model || !feedbackType) return;

    const newIdea = {
        id: Date.now(),
        title,
        description,
        model,
        feedbackType,
        status: 'NEW',
        voteCount: 0,
        submittedBy: author || 'Anonymous',
        submittedDate: new Date().toISOString()
    };

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    if (Config.ENDPOINTS.POST_IDEA) {
        try {
            await fetch(Config.ENDPOINTS.POST_IDEA, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(newIdea)
            });
        } catch {
            showToast('Failed to submit idea. Saved locally.', 'error');
        }
    }

    // Add to local state
    allIdeas.unshift(newIdea);
    saveIdeasLocally();

    closeSubmitModal();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Idea';

    renderIdeas();
    showToast('Idea submitted successfully!', 'success');
}

// ── Sort & Filter ──────────────────────────────────────────────
function setSort(sort, tab) {
    currentSort = sort;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderIdeas();
}

function filterIdeas() {
    renderIdeas();
}

// ── Utilities ──────────────────────────────────────────────────
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getTimeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast' + (type ? ` ${type}` : '');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSubmitModal();
});

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeSubmitModal();
});
