/**
 * The files a worker created or changed, as its worker-phase result records them (PRD_VIEWER_CLARITY 4.1): an artifact of
 * kind `file` with its repo-relative `path` for every captured text file, and `files_not_captured` with a reason for the
 * rest. Both fields are optional additions to worker result 1.0.0, so a result recorded before them has neither and its
 * files are "not captured for this run". Pure helpers, kept out of the component files so those only export components.
 */
import type { WorkerResult } from './api.ts'

export type NotCapturedReason = 'binary' | 'too_large' | 'missing' | 'budget'

export type CapturedFile = { path: string; artifactId: string; sha256: string }

/** One changed file: captured (its artifact), not captured (the recorded reason), or neither when capture was not recorded. */
export type FileEntry = { path: string; captured: CapturedFile | null; reason: NotCapturedReason | null }

/** The shape read here, wide enough for results recorded before and after the `file` kind existed. */
type CaptureFields = {
  changed_files: readonly string[]
  artifacts: readonly { artifact_id: string; kind: string; sha256: string; path?: string }[]
  files_not_captured?: readonly { path: string; reason: string }[]
}

export const NOT_CAPTURED_WORDING: Record<NotCapturedReason, string> = {
  binary: 'not captured: binary file',
  too_large: 'not captured: larger than the 512 KiB per-file cap',
  missing: 'not captured: deleted or renamed away in the snapshot',
  budget: 'not captured: the 8 MiB captured-file budget of the packet was spent',
}

function isReason(value: string): value is NotCapturedReason {
  return value in NOT_CAPTURED_WORDING
}

/** Whether a changed file is shown rendered as Markdown rather than as source. */
export function isMarkdown(path: string): boolean {
  return /\.md$/i.test(path)
}

/** The captured `file` artifacts of a result, in artifact order. */
export function capturedFiles(result: WorkerResult): CapturedFile[] {
  const fields: CaptureFields = result
  return fields.artifacts.flatMap(artifact => artifact.kind === 'file' && typeof artifact.path === 'string'
    ? [{ path: artifact.path, artifactId: artifact.artifact_id, sha256: artifact.sha256 }]
    : [])
}

/** Whether the result's artifact is a captured file (listed with the created files, not among other artifacts). */
export function isFileArtifact(artifact: WorkerResult['artifacts'][number]): boolean {
  const fields: CaptureFields['artifacts'][number] = artifact
  return fields.kind === 'file'
}

/**
 * Every changed file with what was captured of it, in `changed_files` order, then any not-captured entry the list does not
 * name. `recorded` is false when the result carries neither file artifacts nor `files_not_captured` (recorded before capture).
 */
export function fileCapture(result: WorkerResult): { recorded: boolean; entries: FileEntry[] } {
  const fields: CaptureFields = result
  const captured = new Map(capturedFiles(result).map(file => [file.path, file]))
  const notCaptured = new Map((fields.files_not_captured ?? []).map(entry => [entry.path, isReason(entry.reason) ? entry.reason : null]))
  const recorded = captured.size > 0 || fields.files_not_captured !== undefined
  const paths = [...fields.changed_files]
  for (const path of [...captured.keys(), ...notCaptured.keys()]) if (!paths.includes(path)) paths.push(path)
  return { recorded, entries: paths.map(path => ({ path, captured: captured.get(path) ?? null, reason: notCaptured.get(path) ?? null })) }
}

/** The element id of a captured file's panel on the launch node, so review findings can link to it. */
export function fileAnchor(path: string): string {
  return `file-${path.replace(/[^A-Za-z0-9-]/g, character => `_${character.charCodeAt(0).toString(16)}`)}`
}
