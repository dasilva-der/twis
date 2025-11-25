const socket = io();

const messagesList = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");

const nicknameOverlay = document.getElementById("nickname-overlay");
const nicknameInput = document.getElementById("nickname-input");
const passwordInput = document.getElementById("password-input");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const nicknameDisplay = document.getElementById("nickname-display");

let nickname = "";

// handle nickname after auth
function setNickname(name) {
  nickname = name.trim() || "Anon";
  nicknameDisplay.textContent = nickname;
  nicknameOverlay.style.display = "none";
  localStorage.setItem("twis_nickname", nickname);
}

// try to prefill nickname if user used site before
const savedNick = localStorage.getItem("twis_nickname");
if (savedNick) {
  nicknameInput.value = savedNick;
}

// helper: call API
async function authRequest(mode) {
  const name = nicknameInput.value.trim();
  const pass = passwordInput.value.trim();

  if (!name || !pass) {
    alert("Enter both nickname and password.");
    return;
  }

  try {
    const res = await fetch(`/auth/${mode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nickname: name, password: pass }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || `Failed to ${mode}.`);
      return;
    }

    // success
    setNickname(name);
  } catch (err) {
    console.error(err);
    alert("Network error. Try again.");
  }
}

signupBtn.addEventListener("click", () => {
  authRequest("register");
});

loginBtn.addEventListener("click", () => {
  authRequest("login");
});

// send message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim() === "" || !nickname) return;

  socket.emit("chat message", {
    nickname,
    text: input.value,
  });

  input.value = "";
});

// receive history
socket.on("chat history", (msgs) => {
  messagesList.innerHTML = "";
  msgs.forEach(addMessage);
  scrollToBottom();
});

// receive new messages
socket.on("chat message", (msg) => {
  addMessage(msg);
  scrollToBottom();
});

function addMessage(msg) {
  const li = document.createElement("li");
  li.className = "message";

  const header = document.createElement("div");
  header.className = "message-header";

  const nickSpan = document.createElement("span");
  nickSpan.className = "message-nick";
  nickSpan.textContent = msg.nickname || "Anon";

  const timeSpan = document.createElement("span");
  timeSpan.className = "message-time";
  timeSpan.textContent = formatTime(msg.time);

  header.appendChild(nickSpan);
  header.appendChild(timeSpan);

  const textP = document.createElement("div");
  textP.className = "message-text";
  textP.textContent = msg.text;

  li.appendChild(header);
  li.appendChild(textP);

  messagesList.appendChild(li);
}

function scrollToBottom() {
  messagesList.parentElement.scrollTop = messagesList.parentElement.scrollHeight;
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
