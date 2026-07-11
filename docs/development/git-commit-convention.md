# Git Commit Convention

本项目使用 Conventional Commits 风格，方便保持提交历史清晰，也方便后续生成 changelog、做版本管理和 CI 校验。

## 格式

```text
<type>(<scope>): <subject>
```

`scope` 可选；如果改动范围清晰，建议填写。

示例：

```text
feat(web): add weather layer switcher
fix(api): validate forecast grid bbox
docs: add git commit convention
chore(infra): add docker compose services
```

## Type

常用类型：

- `feat`: 新功能。
- `fix`: 修复问题。
- `docs`: 文档变更。
- `style`: 代码格式、空格、分号等不影响行为的变更。
- `refactor`: 重构，不新增功能也不修复 bug。
- `perf`: 性能优化。
- `test`: 新增或修改测试。
- `build`: 构建系统、依赖、打包配置变更。
- `ci`: CI/CD 配置变更。
- `chore`: 维护性工作，例如脚本、配置、清理。
- `revert`: 回滚提交。

## Scope

推荐 scope：

- `web`: Next.js 前端。
- `api`: Nest.js API。
- `db`: Drizzle/PostgreSQL 相关。
- `shared`: 共享类型和 schema。
- `infra`: Docker Compose、部署和基础设施。
- `docs`: 文档。
- `repo`: 仓库根配置。

## Subject

- 使用简短明确的描述。
- 不以句号结尾。
- 优先描述做了什么，而不是过程。
- 建议使用英文，必要时可以使用中文，但同一个 PR 或任务内尽量保持一致。

推荐：

```text
feat(web): add timeline playback controls
```

不推荐：

```text
feat: update files
```

## Body

当提交需要解释背景、取舍或影响范围时，添加 body：

```text
feat(api): add mock grid endpoint

Expose a production-shaped GridResponse so the frontend can be built before
real weather ingestion is available.
```

## Breaking Changes

破坏性变更必须在 type 后加 `!`，并在 footer 里说明：

```text
feat(api)!: change grid response shape

BREAKING CHANGE: scalar grid values are now returned as a flat values array.
```

## Issue References

如果提交关联 issue，在 footer 中引用：

```text
fix(api): reject invalid forecast layer

Closes #12
```

## Commit Size

- 一个提交只表达一个清晰意图。
- 不把无关改动混在同一个提交里。
- 提交前运行相关格式化、lint 和测试命令。

## Future Enforcement

当前仓库还处于设计和脚手架阶段，先以文档规范为准。等 monorepo 脚手架建立后，再加入 `commitlint` 和 Git hooks，在本地和 CI 中自动校验提交信息。
