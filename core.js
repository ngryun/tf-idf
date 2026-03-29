(function attachTfIdfCore(global) {
  const IDF_MODES = {
    ratio: {
      value: "ratio",
      label: "비율형",
      formulaText: "전체 문서 수 / 단어가 출현한 문서 수",
      formulaShort: "N / DF",
    },
    log10: {
      value: "log10",
      label: "상용로그형",
      formulaText: "log10(전체 문서 수 / 단어가 출현한 문서 수)",
      formulaShort: "log10(N / DF)",
    },
  };

  const DEFAULT_STOPWORDS = [
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "by",
    "for",
    "from",
    "has",
    "have",
    "he",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "this",
    "to",
    "was",
    "were",
    "with",
    "및",
    "그",
    "그리고",
    "그러나",
    "그래서",
    "그런데",
    "그의",
    "그들",
    "나는",
    "너는",
    "또",
    "또는",
    "대한",
    "더",
    "등",
    "때문에",
    "매우",
    "무엇",
    "및",
    "바로",
    "수",
    "어떤",
    "어느",
    "우리",
    "으로",
    "으로서",
    "은",
    "는",
    "이",
    "가",
    "을",
    "를",
    "에",
    "에서",
    "에게",
    "와",
    "과",
    "의",
    "도",
    "만",
    "처럼",
    "하다",
    "했다",
    "하면",
    "하고",
    "하지만",
    "한",
    "할",
    "해",
    "했다",
    "혹은",
  ];

  const HANGUL_PARTICLE_SUFFIXES = [
    "으로부터",
    "에게서는",
    "에게서",
    "으로는",
    "에서는",
    "이라는",
    "이라고",
    "이지만",
    "까지는",
    "부터는",
    "들에게",
    "들에게서",
    "들에게는",
    "들에서",
    "들까지",
    "들부터",
    "처럼",
    "들의",
    "들이",
    "들은",
    "들과",
    "으로",
    "에서",
    "에게",
    "한테",
    "이랑",
    "하고",
    "보다",
    "까지",
    "부터",
    "조차",
    "마저",
    "밖에",
    "과",
    "와",
    "은",
    "는",
    "이",
    "가",
    "을",
    "를",
    "에",
    "의",
    "도",
    "만",
    "로",
  ];

  function stripHangulParticles(token) {
    if (!/^[가-힣]+$/.test(token)) {
      return token;
    }

    let normalized = token;
    let changed = true;

    while (changed) {
      changed = false;

      for (const suffix of HANGUL_PARTICLE_SUFFIXES) {
        if (normalized.length <= suffix.length + 1) {
          continue;
        }

        if (normalized.endsWith(suffix)) {
          normalized = normalized.slice(0, -suffix.length);
          changed = true;
          break;
        }
      }
    }

    return normalized;
  }

  function createStopwordSet(customInput = "") {
    const customStopwords = customInput
      .split(/[\s,]+/)
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);

    return new Set([...DEFAULT_STOPWORDS, ...customStopwords]);
  }

  function tokenize(text, stopwordSet, options = {}) {
    const minTokenLength = Number.isFinite(options.minTokenLength)
      ? Math.max(1, options.minTokenLength)
      : 1;
    const excludeNumbers = options.excludeNumbers !== false;

    const cleanedText = String(text ?? "")
      .toLowerCase()
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^0-9a-zA-Z가-힣\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanedText) {
      return [];
    }

    return cleanedText
      .split(" ")
      .map((token) => token.trim())
      .map(stripHangulParticles)
      .filter(Boolean)
      .filter((token) => token.length >= minTokenLength)
      .filter((token) => !(excludeNumbers && /^\d+$/.test(token)))
      .filter((token) => !stopwordSet.has(token));
  }

  function countTerms(tokens) {
    const counts = new Map();

    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }

    return counts;
  }

  function buildVocabulary(documents) {
    const totalCounts = new Map();

    for (const document of documents) {
      for (const [term, count] of document.termCounts.entries()) {
        totalCounts.set(term, (totalCounts.get(term) ?? 0) + count);
      }
    }

    return [...totalCounts.entries()]
      .sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        return a[0].localeCompare(b[0], "ko");
      })
      .map(([term]) => term);
  }

  function normalizeIdfMode(mode) {
    return mode === IDF_MODES.log10.value ? IDF_MODES.log10.value : IDF_MODES.ratio.value;
  }

  function analyzeDocuments(inputDocuments, customStopwords = "", options = {}) {
    const stopwordSet = createStopwordSet(customStopwords);
    const idfMode = normalizeIdfMode(options.idfMode);
    const idfModeMeta = IDF_MODES[idfMode];

    const documents = inputDocuments
      .map((document, index) => {
        const title = String(document.title || `문서 ${index + 1}`).trim() || `문서 ${index + 1}`;
        const text = String(document.text || "");
        const tokens = tokenize(text, stopwordSet, options);
        const termCounts = countTerms(tokens);
        return {
          id: document.id ?? `doc-${index + 1}`,
          title,
          text,
          tokens,
          totalTerms: tokens.length,
          uniqueTerms: termCounts.size,
          termCounts,
        };
      })
      .filter((document) => document.text.trim().length > 0);

    const documentCount = documents.length;
    const vocabulary = buildVocabulary(documents);

    const dfMap = new Map();
    const totalCountMap = new Map();

    for (const term of vocabulary) {
      let df = 0;
      let totalCount = 0;

      for (const document of documents) {
        const count = document.termCounts.get(term) ?? 0;
        if (count > 0) {
          df += 1;
        }
        totalCount += count;
      }

      dfMap.set(term, df);
      totalCountMap.set(term, totalCount);
    }

    const idfMap = new Map(
      vocabulary.map((term) => {
        const df = dfMap.get(term) ?? 0;
        const ratio = df > 0 ? documentCount / df : 0;
        const idf = idfMode === IDF_MODES.log10.value ? Math.log10(ratio) : ratio;
        return [term, idf];
      }),
    );

    const tfTable = {};
    const tfIdfTable = {};

    for (const term of vocabulary) {
      tfTable[term] = {};
      tfIdfTable[term] = {};

      for (const document of documents) {
        const count = document.termCounts.get(term) ?? 0;
        const tf = document.totalTerms > 0 ? count / document.totalTerms : 0;
        const tfIdf = tf * (idfMap.get(term) ?? 0);

        tfTable[term][document.id] = {
          count,
          tf,
        };

        tfIdfTable[term][document.id] = {
          count,
          score: tfIdf,
        };
      }
    }

    const dfIdfRows = vocabulary.map((term) => ({
      term,
      df: dfMap.get(term) ?? 0,
      idf: idfMap.get(term) ?? 0,
      idfMode,
      totalCount: totalCountMap.get(term) ?? 0,
    }));

    const documentSummaries = documents.map((document) => {
      const topKeywords = vocabulary
        .map((term) => ({
          term,
          count: document.termCounts.get(term) ?? 0,
          tf: tfTable[term][document.id].tf,
          score: tfIdfTable[term][document.id].score,
          idf: idfMap.get(term) ?? 0,
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.term.localeCompare(b.term, "ko");
        })
        .slice(0, 8);

      return {
        ...document,
        topKeywords,
      };
    });

    return {
      documents,
      documentCount,
      vocabulary,
      stopwordSet,
      idfMode,
      idfModeMeta,
      tfTable,
      dfIdfRows,
      tfIdfTable,
      documentSummaries,
    };
  }

  function toCsv(rows) {
    return rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            const escaped = text.replace(/"/g, '""');
            return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
          })
          .join(","),
      )
      .join("\n");
  }

  function formatDecimal(value, digits = 4) {
    return Number(value ?? 0).toFixed(digits);
  }

  global.TfIdfCore = {
    DEFAULT_STOPWORDS,
    IDF_MODES,
    analyzeDocuments,
    createStopwordSet,
    tokenize,
    countTerms,
    toCsv,
    formatDecimal,
  };
})(window);
