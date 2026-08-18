// static/js/api.js

export async function fetchThemes() {
  const res = await fetch("/api/themes");
  if (!res.ok) throw new Error("Network response was not ok");
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Network response was not ok");
  return res.json();
}

export async function fetchHintAPI(revealed_indices, board_index) {
  const response = await fetch("/api/hint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      revealed_indices,
      board_index,
    }),
  });
  return response.json();
}

export async function submitGuessAPI(wordToSubmit) {
  const response = await fetch("/api/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: wordToSubmit }),
  });
  return response.json();
}

export async function giveUpAPI() {
  const response = await fetch("/api/give-up", { method: "POST" });
  return response.json();
}