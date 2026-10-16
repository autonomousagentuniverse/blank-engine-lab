# Kimi independent review of unresolved pink eye rims

User connected repository secrets in GitHub Actions: \`MOONSHOT_API_KEY\` (credential) and \`MOONSHOT_ID\` (optional value; used only if it actually matches a model ID returned by /models). Never echo, store or expose the secret values.

The review workflow is **read-only for engine code and GLBs**. It provides Kimi with v4-v7 source code, evidence and actual Chrome before/after macro screenshots when downloadable. It asks Kimi to challenge the existing diagnosis and recommend *measurable* first debugging steps, not to invent a fix or merge code.

Secrets are injected only into the GitHub-hosted Actions process. The response is stored as a time-limited Actions artifact, along with safe usage metadata.

Default permanent trigger is manual \`workflow_dispatch\`. A temporary **experiment-branch-only** push trigger is included solely to obtain this one immediate review with the available GitHub connector; remove immediately after collecting results. No live deployment or production merge. Geometry visual approval remains BLOCKED.
