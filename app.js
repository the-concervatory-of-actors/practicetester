const output = document.getElementById("output");
const statusText = document.getElementById("status");

const generateBtn = document.getElementById("generateBtn");
const flashcardBtn = document.getElementById("flashcardBtn");
const pdfBtn = document.getElementById("pdfBtn");

const apiKeyInput = document.getElementById("apiKey");
const notesInput = document.getElementById("notesInput");
const questionType = document.getElementById("questionType");
const difficulty = document.getElementById("difficulty");
const questionCount = document.getElementById("questionCount");

function setStatus(text) {
  statusText.textContent = text;
}

function validateInputs() {
  if (!apiKeyInput.value.trim()) {
    alert("Please enter your Hugging Face API key.\nGet free at: huggingface.co/settings/tokens");
    return false;
  }
  if (!notesInput.value.trim()) {
    alert("Please enter study notes first.");
    return false;
  }
  return true;
}

async function callHuggingFace(prompt) {
  const apiKey = apiKeyInput.value.trim();
  
  try {
    const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [{role: "user", content: prompt}],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || errorData.error || "API request failed");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    throw new Error(`Hugging Face API Error: ${error.message}`);
  }
}

function parseQuestions(content) {
  const questions = [];
  const lines = content.split('\n');
  let currentQuestion = null;

  for (let line of lines) {
    line = line.trim();
    
    if (line.match(/^Question \d+:|^Q\d+:|^\d+\./)) {
      if (currentQuestion && currentQuestion.question) {
        questions.push(currentQuestion);
      }
      currentQuestion = { question: line, options: [], answer: "" };
    } else if (currentQuestion && (line.match(/^[A-D]\)/) || line.match(/^[A-D]\./) || line.match(/^\([A-D]\)/))) {
      currentQuestion.options.push(line);
    } else if (currentQuestion && line.toLowerCase().startsWith("answer:")) {
      currentQuestion.answer = line.replace(/^answer:\s*/i, "");
    }
  }

  if (currentQuestion && currentQuestion.question) {
    questions.push(currentQuestion);
  }

  return questions.filter(q => q.question && q.options.length > 0);
}

function renderQuestions(questions) {
  let html = "";
  questions.forEach((q, index) => {
    html += `
      <div class="question-card">
        <h3>Question ${index + 1}</h3>
        <p><strong>${q.question}</strong></p>
        <ul>
          ${q.options.map(opt => `<li>${opt}</li>`).join("")}
        </ul>
        ${q.answer ? `<p style="margin-top: 10px; color: #10b981;"><strong>Answer:</strong> ${q.answer}</p>` : ""}
      </div>
    `;
  });
  return html;
}

function parseFlashcards(content) {
  const flashcards = [];
  const sections = content.split(/\n(?=Card \d+:|FC\d+:|Flashcard \d+:)/i);

  for (let section of sections) {
    const lines = section.split('\n');
    let front = "";
    let back = "";
    let captureBack = false;

    for (let line of lines) {
      line = line.trim();
      if (line.toLowerCase().startsWith("front:") || line.match(/^Question:|Front:/i)) {
        front = line.replace(/^(front:|question:)/i, "").trim();
        captureBack = false;
      } else if (line.toLowerCase().startsWith("back:") || line.toLowerCase().startsWith("answer:")) {
        back = line.replace(/^(back:|answer:)/i, "").trim();
        captureBack = true;
      } else if (captureBack && line && !line.match(/^(Card|FC|Flashcard)/i)) {
        back += " " + line;
      } else if (!front && line && !line.match(/^(Card|FC|Flashcard)/i)) {
        front = line;
      }
    }

    if (front && back) {
      flashcards.push({ front: front.trim(), back: back.trim() });
    }
  }

  return flashcards;
}

function renderFlashcards(flashcards) {
  let html = "";
  flashcards.forEach((card, index) => {
    html += `
      <div class="flashcard">
        <h3>Flashcard ${index + 1}</h3>
        <p><strong>Front:</strong> ${card.front}</p>
        <p><strong>Back:</strong> ${card.back}</p>
      </div>
    `;
  });
  return html;
}

generateBtn.addEventListener("click", async () => {
  if (!validateInputs()) return;

  output.innerHTML = "";
  setStatus("Generating Questions with AI...");

  try {
    const type = questionType.value;
    const diff = difficulty.value;
    const count = questionCount.value;
    const notes = notesInput.value;

    const prompt = `Based on the following study notes, generate exactly ${count} ${type} questions at ${diff} difficulty level. Format each question clearly with the question text, options (for multiple choice), and the correct answer.

Study Notes:
${notes}

Generate ${count} questions now:`;

    const aiContent = await callHuggingFace(prompt);
    const questions = parseQuestions(aiContent);

    if (questions.length === 0) {
      output.innerHTML = `<p style="color: #ef4444;">Could not parse questions. Raw AI response:</p><pre>${aiContent}</pre>`;
    } else {
      output.innerHTML = renderQuestions(questions);
    }

    setStatus(`${questions.length} Questions Generated`);
  } catch (error) {
    setStatus("Error");
    output.innerHTML = `<p style="color: #ef4444;"><strong>Error:</strong> ${error.message}</p>`;
  }
});

flashcardBtn.addEventListener("click", async () => {
  if (!validateInputs()) return;

  output.innerHTML = "";
  setStatus("Generating Flashcards with AI...");

  try {
    const notes = notesInput.value;

    const prompt = `Based on the following study notes, create 10 flashcards for studying. Each flashcard should have:
- A question/concept on the front
- A detailed explanation/answer on the back

Format each flashcard clearly with "Front:" and "Back:" labels.

Study Notes:
${notes}

Generate 10 flashcards now:`;

    const aiContent = await callHuggingFace(prompt);
    const flashcards = parseFlashcards(aiContent);

    if (flashcards.length === 0) {
      output.innerHTML = `<p style="color: #ef4444;">Could not parse flashcards. Raw AI response:</p><pre>${aiContent}</pre>`;
    } else {
      output.innerHTML = renderFlashcards(flashcards);
    }

    setStatus(`${flashcards.length} Flashcards Generated`);
  } catch (error) {
    setStatus("Error");
    output.innerHTML = `<p style="color: #ef4444;"><strong>Error:</strong> ${error.message}</p>`;
  }
});

pdfBtn.addEventListener("click", () => {
  setStatus("Preparing PDF Export...");

  setTimeout(() => {
    alert("PDF Export system coming soon. You can copy and paste the content into Word or use Print to PDF.");
    setStatus("Ready");
  }, 500);
});
