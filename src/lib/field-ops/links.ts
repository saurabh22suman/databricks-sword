type DeploymentLinkParams = {
  workspaceUrl?: string
  catalogName?: string
  schemaPrefix: string
}

function normalizeWorkspaceUrl(url?: string): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed.replace(/\/+$/, "")
}

export function buildFieldOpsLinks(params: DeploymentLinkParams): {
  workspace: string | null
  notebooks: string | null
  explorerBronze: string | null
  explorerSilver: string | null
  explorerGold: string | null
} {
  const workspace = normalizeWorkspaceUrl(params.workspaceUrl)
  const catalogName = params.catalogName?.trim()

  if (!workspace) {
    return {
      workspace: null,
      notebooks: null,
      explorerBronze: null,
      explorerSilver: null,
      explorerGold: null,
    }
  }

  // DAB deploys to /Shared/field-ops/<schemaPrefix> (shared, see bundle.ts:278).
  // This MUST match the path that bundle.ts writes to databricks.yml's
  // workspace.root_path, so the deployed files appear at the location users
  // navigate to from the "Open Deployed Notebooks" UI link.
  const notebooks = `${workspace}/#workspace/Shared/field-ops/${params.schemaPrefix}`

  const explorerBronze =
    catalogName && params.schemaPrefix
      ? `${workspace}/explore/data/${catalogName}/${params.schemaPrefix}_bronze`
      : null
  const explorerSilver =
    catalogName && params.schemaPrefix
      ? `${workspace}/explore/data/${catalogName}/${params.schemaPrefix}_silver`
      : null
  const explorerGold =
    catalogName && params.schemaPrefix
      ? `${workspace}/explore/data/${catalogName}/${params.schemaPrefix}_gold`
      : null

  return {
    workspace,
    notebooks,
    explorerBronze,
    explorerSilver,
    explorerGold,
  }
}
