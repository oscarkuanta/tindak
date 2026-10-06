const VERIFICATION_RANK = { OFFICIAL: 0, COMMUNITY: 1 };

const SIMILAR_STOPWORDS = new Set([
  'jalan',
  'jl',
  'jln',
  'raya',
  'gang',
  'gg',
  'sekolah',
  'sd',
  'sdn',
  'smp',
  'smpn',
  'sma',
  'sman',
  'smk',
  'smkn',
  'mi',
  'mts',
  'ma',
  'kampus',
  'universitas',
  'kantor',
  'gedung',
  'desa',
  'kelurahan',
  'kecamatan',
  'perumahan',
  'rt',
  'rw',
  'dan',
  'di',
  'kota',
  'kabupaten',
]);

function normalize(value = '') {
  return value.toLocaleLowerCase('id-ID').trim();
}

export function nameMatchRank(name, query) {
  if (!query) return 0;
  const target = normalize(name);
  const needle = normalize(query);
  if (target === needle) return 0;
  if (target.startsWith(needle)) return 1;
  if (target.includes(needle)) return 2;
  return 3;
}

export function compareSearchResults(query) {
  return (a, b) =>
    nameMatchRank(a.name, query) - nameMatchRank(b.name, query) ||
    VERIFICATION_RANK[a.verification] - VERIFICATION_RANK[b.verification] ||
    (b.activeReportCount ?? 0) - (a.activeReportCount ?? 0) ||
    new Date(b.createdAt) - new Date(a.createdAt) ||
    b.id - a.id;
}

export function similarTokens(name) {
  const words = normalize(name)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3);
  const unique = [...new Set(words)];
  const significant = unique.filter((word) => !SIMILAR_STOPWORDS.has(word));
  return significant.length > 0 ? significant : unique;
}

export function rankSimilarBoards(boards, name, limit) {
  const tokens = similarTokens(name);
  if (tokens.length === 0) return [];
  return boards
    .map((board) => {
      const target = normalize(board.name);
      const hits = tokens.filter((token) => target.includes(token)).length;
      return { board, hits, rank: nameMatchRank(board.name, name) };
    })
    .filter((item) => item.hits > 0)
    .sort(
      (a, b) =>
        b.hits - a.hits ||
        a.rank - b.rank ||
        VERIFICATION_RANK[a.board.verification] - VERIFICATION_RANK[b.board.verification] ||
        a.board.name.localeCompare(b.board.name, 'id'),
    )
    .slice(0, limit)
    .map((item) => item.board);
}
