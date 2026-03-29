const { DEFAULT_STOPWORDS, IDF_MODES, analyzeDocuments, formatDecimal, toCsv } = window.TfIdfCore;

const documentsContainer = document.querySelector("#documents-container");
const addDocumentButton = document.querySelector("#add-document-button");
const analyzeButton = document.querySelector("#analyze-button");
const resetButton = document.querySelector("#reset-button");
const sampleButton = document.querySelector("#sample-button");
const customStopwordsField = document.querySelector("#custom-stopwords");
const minTokenLengthField = document.querySelector("#min-token-length");
const excludeNumbersField = document.querySelector("#exclude-numbers");
const visibleTermsField = document.querySelector("#visible-terms");
const idfModeFields = [...document.querySelectorAll('input[name="idf-mode"]')];
const statusBox = document.querySelector("#status-box");
const resultsPanel = document.querySelector("#results-panel");
const summaryContainer = document.querySelector("#document-summary");
const tfTableContainer = document.querySelector("#tf-table");
const dfIdfTableContainer = document.querySelector("#df-idf-table");
const tfIdfTableContainer = document.querySelector("#tfidf-table");
const defaultStopwordsPreview = document.querySelector("#default-stopwords-preview");
const idfFormulaCopy = document.querySelector("#idf-formula-copy");
const idfDescription = document.querySelector("#idf-description");
const downloadTfButton = document.querySelector("#download-tf-button");
const downloadDfIdfButton = document.querySelector("#download-df-idf-button");
const downloadTfIdfButton = document.querySelector("#download-tfidf-button");

let documentCounter = 0;
let lastAnalysis = null;

const sampleDocuments = [
  {
    title: "문서 1",
    text: "인공지능 수학 수업에서는 학생들이 데이터의 특징을 수치로 해석하는 경험이 중요하다. TF-IDF는 각 문서에서 중요한 단어를 찾아 주기 때문에 학생들이 문서 분류와 정보 검색의 원리를 이해하기에 적합하다.",
  },
  {
    title: "문서 2",
    text: "자연어 처리는 컴퓨터가 사람의 언어를 분석하고 이해하도록 돕는 기술이다. 불용어를 제거하고 핵심 단어의 중요도를 계산하면 긴 글에서도 주제를 빠르게 파악할 수 있다.",
  },
  {
    title: "문서 3",
    text: "학생들은 같은 주제의 글이라도 문서마다 반복되는 단어와 드물게 등장하는 단어가 다르다는 사실을 관찰할 수 있다. TF-IDF 표를 보면 각 문서의 핵심 개념이 무엇인지 비교하기 쉬워진다.",
  },
];

function setStatus(message, tone = "") {
  statusBox.textContent = message;
  statusBox.className = `status-box${tone ? ` ${tone}` : ""}`;
}

function buildStopwordPreview() {
  const englishStopwords = DEFAULT_STOPWORDS.filter((word) => /^[a-z]+$/.test(word));
  const koreanStopwords = DEFAULT_STOPWORDS.filter((word) => /[가-힣]/.test(word));

  const koreanPreview = koreanStopwords.slice(0, 18).join(", ");
  const englishPreview = englishStopwords.slice(0, 12).join(", ");

  return `한국어 예시: ${koreanPreview} | 영어 예시: ${englishPreview}`;
}

function getSelectedIdfMode() {
  const selected = idfModeFields.find((field) => field.checked);
  return selected ? selected.value : IDF_MODES.ratio.value;
}

function updateIdfText() {
  const idfMode = getSelectedIdfMode();
  const meta = IDF_MODES[idfMode] ?? IDF_MODES.ratio;
  const message = `현재 선택: IDF = ${meta.formulaText}`;
  idfFormulaCopy.textContent = message;
  idfDescription.textContent = message;
}

function nextDocumentTitle() {
  return `문서 ${documentCounter}`;
}

function updateDocumentBadges() {
  const cards = [...documentsContainer.querySelectorAll(".document-card")];
  cards.forEach((card, index) => {
    const badge = card.querySelector(".document-badge");
    badge.textContent = `문서 ${index + 1}`;
  });
}

function createDocumentCard(initialData = {}) {
  documentCounter += 1;

  const card = document.createElement("article");
  card.className = "document-card";
  card.dataset.documentId = `doc-${documentCounter}`;

  card.innerHTML = `
    <div class="document-meta">
      <span class="document-badge">문서 ${documentCounter}</span>
      <button class="danger-button remove-document-button" type="button">삭제</button>
    </div>
    <label class="field">
      <span>문서 제목</span>
      <input
        class="document-title"
        type="text"
        value="${escapeAttribute(initialData.title || nextDocumentTitle())}"
        placeholder="예: 신문 기사 A"
      />
    </label>
    <label class="field">
      <span>문서 내용</span>
      <textarea
        class="document-text"
        placeholder="긴 문서를 여기에 붙여 넣으세요."
      >${escapeHtml(initialData.text || "")}</textarea>
    </label>
  `;

  card.querySelector(".remove-document-button").addEventListener("click", () => {
    if (documentsContainer.children.length <= 1) {
      setStatus("문서는 최소 1개는 남겨 두어야 합니다.", "warning");
      return;
    }

    card.remove();
    updateDocumentBadges();
    setStatus("문서를 삭제했습니다. 필요하면 다시 추가해 주세요.");
  });

  return card;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function collectDocuments() {
  return [...documentsContainer.querySelectorAll(".document-card")].map((card) => ({
    id: card.dataset.documentId,
    title: card.querySelector(".document-title").value.trim(),
    text: card.querySelector(".document-text").value,
  }));
}

function addDocument(initialData = {}) {
  documentsContainer.append(createDocumentCard(initialData));
}

function resetDocuments() {
  documentsContainer.innerHTML = "";
  documentCounter = 0;
  addDocument();
  addDocument();
  addDocument();
  customStopwordsField.value = "";
  document.querySelector("#idf-mode-ratio").checked = true;
  minTokenLengthField.value = "1";
  excludeNumbersField.checked = true;
  visibleTermsField.value = "60";
  lastAnalysis = null;
  resultsPanel.classList.add("hidden");
  hideDownloadButtons();
  updateIdfText();
  setStatus("새 문서 입력 칸을 준비했습니다.");
}

function fillSampleDocuments() {
  documentsContainer.innerHTML = "";
  documentCounter = 0;
  sampleDocuments.forEach((sample) => addDocument(sample));
  lastAnalysis = null;
  resultsPanel.classList.add("hidden");
  hideDownloadButtons();
  setStatus("예시 문서를 채웠습니다. 바로 분석해 보셔도 됩니다.", "success");
}

function hideDownloadButtons() {
  downloadTfButton.classList.add("hidden");
  downloadDfIdfButton.classList.add("hidden");
  downloadTfIdfButton.classList.add("hidden");
}

function renderSummary(summaries) {
  summaryContainer.innerHTML = summaries
    .map(
      (document) => `
        <article class="summary-card">
          <h3>${escapeHtml(document.title)}</h3>
          <div class="summary-meta">
            <span class="summary-pill">유효 토큰 ${document.totalTerms}개</span>
            <span class="summary-pill">고유 단어 ${document.uniqueTerms}개</span>
          </div>
          <div class="keyword-list">
            ${
              document.topKeywords.length > 0
                ? document.topKeywords
                    .map(
                      (keyword) => `
                        <span class="keyword-chip">
                          ${escapeHtml(keyword.term)}
                          <strong>${formatDecimal(keyword.score, 4)}</strong>
                        </span>
                      `,
                    )
                    .join("")
                : '<span class="muted-copy">남은 토큰이 없어 핵심어를 계산하지 못했습니다.</span>'
            }
          </div>
        </article>
      `,
    )
    .join("");
}

function buildTfTable(analysis, terms) {
  const headerCells = analysis.documents
    .map((document) => `<th>${escapeHtml(document.title)}</th>`)
    .join("");

  const rows = terms
    .map((term) => {
      const metricCells = analysis.documents
        .map((document) => {
          const metric = analysis.tfTable[term][document.id];
          return `
            <td>
              <span class="metric-main">${formatDecimal(metric.tf, 4)}</span>
              <span class="metric-sub">${metric.count}회</span>
            </td>
          `;
        })
        .join("");

      return `
        <tr>
          <td class="term-cell">${escapeHtml(term)}</td>
          ${metricCells}
        </tr>
      `;
    })
    .join("");

  tfTableContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>용어</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildDfIdfTable(analysis, rows) {
  const idfHeader = `IDF (${escapeHtml(analysis.idfModeMeta.formulaShort)})`;

  dfIdfTableContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>용어</th>
          <th>전체 빈도</th>
          <th>DF</th>
          <th>${idfHeader}</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td class="term-cell">${escapeHtml(row.term)}</td>
                <td>${row.totalCount}</td>
                <td>${row.df}</td>
                <td>${formatDecimal(row.idf, 4)}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function buildTfIdfTable(analysis, terms) {
  const headerCells = analysis.documents
    .map((document) => `<th>${escapeHtml(document.title)}</th>`)
    .join("");

  const rows = terms
    .map((term) => {
      const metricCells = analysis.documents
        .map((document) => {
          const metric = analysis.tfIdfTable[term][document.id];
          return `
            <td>
              <span class="metric-main">${formatDecimal(metric.score, 4)}</span>
              <span class="metric-sub">${metric.count}회</span>
            </td>
          `;
        })
        .join("");

      return `
        <tr>
          <td class="term-cell">${escapeHtml(term)}</td>
          ${metricCells}
        </tr>
      `;
    })
    .join("");

  tfIdfTableContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>용어</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildCsvPayloads(analysis, terms) {
  const tfRows = [
    ["term", ...analysis.documents.map((document) => `${document.title} (tf / count)`)],
    ...terms.map((term) => [
      term,
      ...analysis.documents.map((document) => {
        const metric = analysis.tfTable[term][document.id];
        return `${formatDecimal(metric.tf, 6)} / ${metric.count}`;
      }),
    ]),
  ];

  const dfIdfRows = [
    ["term", "total_count", "df", `idf (${analysis.idfModeMeta.formulaShort})`],
    ...analysis.dfIdfRows.map((row) => [
      row.term,
      row.totalCount,
      row.df,
      formatDecimal(row.idf, 6),
    ]),
  ];

  const tfIdfRows = [
    ["term", ...analysis.documents.map((document) => `${document.title} (tf-idf / count)`)],
    ...terms.map((term) => [
      term,
      ...analysis.documents.map((document) => {
        const metric = analysis.tfIdfTable[term][document.id];
        return `${formatDecimal(metric.score, 6)} / ${metric.count}`;
      }),
    ]),
  ];

  return {
    tfCsv: toCsv(tfRows),
    dfIdfCsv: toCsv(dfIdfRows),
    tfIdfCsv: toCsv(tfIdfRows),
  };
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function wireDownloadButtons(csvPayloads) {
  downloadTfButton.classList.remove("hidden");
  downloadDfIdfButton.classList.remove("hidden");
  downloadTfIdfButton.classList.remove("hidden");

  downloadTfButton.onclick = () => downloadTextFile("tf-table.csv", csvPayloads.tfCsv);
  downloadDfIdfButton.onclick = () =>
    downloadTextFile("df-idf-table.csv", csvPayloads.dfIdfCsv);
  downloadTfIdfButton.onclick = () =>
    downloadTextFile("tf-idf-table.csv", csvPayloads.tfIdfCsv);
}

function analyze() {
  const documents = collectDocuments();
  const nonEmptyDocuments = documents.filter((document) => document.text.trim().length > 0);

  if (nonEmptyDocuments.length === 0) {
    setStatus("먼저 문서 내용을 1개 이상 입력해 주세요.", "warning");
    resultsPanel.classList.add("hidden");
    hideDownloadButtons();
    return;
  }

  const options = {
    idfMode: getSelectedIdfMode(),
    minTokenLength: Number(minTokenLengthField.value) || 1,
    excludeNumbers: excludeNumbersField.checked,
  };

  const analysis = analyzeDocuments(documents, customStopwordsField.value, options);

  if (analysis.vocabulary.length === 0) {
    setStatus(
      "불용어 제거 후 남은 단어가 없습니다. 추가 불용어나 최소 토큰 길이를 다시 확인해 주세요.",
      "warning",
    );
    resultsPanel.classList.add("hidden");
    hideDownloadButtons();
    return;
  }

  const visibleTerms = Math.max(0, Number(visibleTermsField.value) || 0);
  const limitedTerms =
    visibleTerms === 0 ? analysis.vocabulary : analysis.vocabulary.slice(0, visibleTerms);
  const limitedDfIdfRows =
    visibleTerms === 0 ? analysis.dfIdfRows : analysis.dfIdfRows.slice(0, visibleTerms);

  renderSummary(analysis.documentSummaries);
  buildTfTable(analysis, limitedTerms);
  buildDfIdfTable(analysis, limitedDfIdfRows);
  buildTfIdfTable(analysis, limitedTerms);
  resultsPanel.classList.remove("hidden");

  const csvPayloads = buildCsvPayloads(analysis, analysis.vocabulary);
  wireDownloadButtons(csvPayloads);

  lastAnalysis = analysis;

  const hiddenTermMessage =
    visibleTerms > 0 && analysis.vocabulary.length > visibleTerms
      ? ` 상위 ${visibleTerms}개 용어만 화면에 표시했습니다.`
      : "";

  setStatus(
    `${analysis.documentCount}개 문서를 분석했고, 고유 용어 ${analysis.vocabulary.length}개를 찾았습니다. IDF 방식은 ${analysis.idfModeMeta.label}입니다.${hiddenTermMessage}`,
    "success",
  );
}

function boot() {
  defaultStopwordsPreview.textContent = buildStopwordPreview();
  updateIdfText();
  resetDocuments();
}

addDocumentButton.addEventListener("click", () => {
  addDocument();
  updateDocumentBadges();
  setStatus("새 문서 입력 칸을 추가했습니다.");
});

sampleButton.addEventListener("click", () => {
  fillSampleDocuments();
  updateDocumentBadges();
});

resetButton.addEventListener("click", () => {
  resetDocuments();
});

analyzeButton.addEventListener("click", analyze);

visibleTermsField.addEventListener("change", () => {
  if (lastAnalysis) {
    analyze();
  }
});

idfModeFields.forEach((field) => {
  field.addEventListener("change", () => {
    updateIdfText();
    if (lastAnalysis) {
      analyze();
    }
  });
});

boot();
