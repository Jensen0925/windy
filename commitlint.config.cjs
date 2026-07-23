module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 72],
    "scope-enum": [
      2,
      "always",
      [
        "web",
        "api",
        "ingest",
        "process",
        "db",
        "weather",
        "ui",
        "map",
        "infra",
        "config",
        "deps",
        "docs",
        "repo",
      ],
    ],
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "subject-full-stop": [2, "never", "."],
  },
};
