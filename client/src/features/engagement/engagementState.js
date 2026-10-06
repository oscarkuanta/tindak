export function stateFromReport(report) {
  return {
    supportCount: report.supportCount ?? 1,
    reactionCounts: {
      DANGEROUS: report.reactionCounts?.DANGEROUS ?? 0,
      LONG_STANDING: report.reactionCounts?.LONG_STANDING ?? 0,
      ANNOYING: report.reactionCounts?.ANNOYING ?? 0,
    },
    mySupport: Boolean(report.mySupport),
    myReaction: report.myReaction ?? null,
  };
}

export function toggleSupport(state) {
  return {
    ...state,
    mySupport: !state.mySupport,
    supportCount: state.supportCount + (state.mySupport ? -1 : 1),
  };
}

export function chooseReaction(state, type) {
  const counts = { ...state.reactionCounts };
  if (state.myReaction) counts[state.myReaction] -= 1;
  const next = state.myReaction === type ? null : type;
  if (next) counts[next] += 1;
  return { ...state, reactionCounts: counts, myReaction: next };
}
