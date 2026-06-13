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

  // DAB deploys to ~/field-ops/<schemaPrefix> (per-user, see bundle.ts:273-276).
  // The workspace web UI renders this as the current user's home directory.
  const notebooks = `${workspace}/#workspace/~/field-ops/${params.schemaPrefix}`

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
