module.exports = {
  types: [
    { type: "feat", section: "✨ Features" },
    { type: "fix", section: "🐛 Bug Fixes" },
    { type: "perf", section: "⚡ Performance" },
    { type: "refactor", section: "♻️ Refactoring" },
    { type: "test", section: "✅ Tests", hidden: false },
    { type: "docs", section: "📚 Documentation", hidden: false },
    { type: "chore", hidden: true },
    { type: "style", hidden: true },
    { type: "revert", section: "Reverts", hidden: false },
    { type: "build", section: "Build System", hidden: true },
    { type: "ci", section: "CI/CD", hidden: true },
  ],
  commitUrlFormat:
    "https://github.com/{{owner}}/{{repository}}/commit/{{hash}}",
  compareUrlFormat:
    "https://github.com/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}",
  issueUrlFormat: "https://github.com/{{owner}}/{{repository}}/issues/{{id}}",
  releaseCommitMessageFormat: "chore(release): {{currentTag}}",
};
