import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { Markdown } from '../document/Markdown.tsx'
import { fetchArtifactText, type ReviewFinding, type RunScope, type WorkerResult } from './api.ts'
import { fileAnchor, fileCapture, isMarkdown, NOT_CAPTURED_WORDING, type CapturedFile, type FileEntry } from './files.ts'
import { findingsForFile, linesNamed } from './findings.ts'
import { ErrorPanel, LoadingPanel } from './panels.tsx'
import { useResource, type Resource } from './useResource.ts'

type Props = {
  scope: RunScope
  result: WorkerResult
  /** The run's review findings: null once loaded when no review is recorded. */
  findings: Resource<ReviewFinding[] | null>
  /** A captured file to scroll to, handed over by a review finding link; null otherwise. */
  focusPath: string | null
  onFocusApplied: () => void
}

type View = 'hidden' | 'rendered' | 'source'

function rangeText([from, to]: [number, number]): string {
  return from === to ? `line ${from}` : `lines ${from}–${to}`
}

/** The file as numbered source lines; lines a finding names are wrapped in a mark and carry `data-finding-line`. */
function SourceLines({ text, marked, markRef }: { text: string; marked: [number, number][]; markRef: RefObject<HTMLElement | null> }) {
  const lines = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n')
  const width = String(lines.length).length
  const isMarked = (line: number) => marked.some(([from, to]) => line >= from && line <= to)
  const first = lines.findIndex((_line, index) => isMarked(index + 1)) + 1
  return (
    <pre className="artifact-log file-source" data-testid="file-source" tabIndex={0}>
      {lines.map((line, index) => {
        const number = index + 1
        const content = <><span className="projects-muted" aria-hidden="true">{String(number).padStart(width, ' ')}  </span>{line}{'\n'}</>
        return isMarked(number)
          ? <mark key={number} ref={number === first ? markRef : undefined} data-line={number} data-finding-line="true">{content}</mark>
          : <span key={number} data-line={number}>{content}</span>
      })}
    </pre>
  )
}

/**
 * One captured file: the findings that name it, then its content. Markdown opens rendered; any other text file is shown as
 * source on demand, like logs. "Show lines" switches to the source (the only view where line numbers mean anything), marks
 * the named lines and scrolls the first into view.
 */
function FilePanel({ scope, file, findings, focused }: { scope: RunScope; file: CapturedFile; findings: Resource<ReviewFinding[] | null>; focused: boolean }) {
  const markdown = isMarkdown(file.path)
  const [view, setView] = useState<View>(markdown ? 'rendered' : 'hidden')
  const [marked, setMarked] = useState<[number, number][]>([])
  const [scrollRequest, setScrollRequest] = useState(0)
  const markRef = useRef<HTMLElement | null>(null)
  const load = useCallback((signal: AbortSignal) => fetchArtifactText(scope, file.artifactId, signal), [scope, file.artifactId])
  const { state, reload } = useResource(view === 'hidden' ? null : `file:${file.artifactId}`, load)

  useEffect(() => {
    if (scrollRequest === 0 || state.status !== 'ready') return
    markRef.current?.scrollIntoView({ block: 'center' })
  }, [scrollRequest, state.status])

  const onThisFile = findings.status === 'ready' && findings.data !== null ? findingsForFile(findings.data, file.path) : []
  const showLines = (ranges: [number, number][]) => {
    setMarked(ranges)
    setView('source')
    setScrollRequest(previous => previous + 1)
  }

  return (
    <article className="evidence-section created-file" id={fileAnchor(file.path)} tabIndex={-1} data-testid="created-file" data-path={file.path} data-focused={focused ? 'true' : undefined} aria-label={`File ${file.path}`}>
      <h5><code>{file.path}</code> <span className="projects-muted">sha256 {file.sha256.slice(0, 12)}…</span></h5>

      <section className="file-findings" aria-label={`Findings on ${file.path}`} data-testid="file-findings">
        <h6>Findings on this file</h6>
        {(findings.status === 'loading' || findings.status === 'idle') && <LoadingPanel>Loading the review findings…</LoadingPanel>}
        {findings.status === 'error' && <p className="projects-muted">The review could not be loaded, so findings on this file cannot be shown.</p>}
        {findings.status === 'ready' && findings.data === null && (
          <p className="projects-muted" data-testid="file-findings-none">No review is recorded for this run, so no finding names this file.</p>
        )}
        {findings.status === 'ready' && findings.data !== null && (onThisFile.length === 0 ? (
          <p className="projects-muted" data-testid="file-findings-none">No review finding names this file.</p>
        ) : (
          <ul className="evidence-list">
            {onThisFile.map((finding, index) => {
              const ranges = linesNamed(finding.message, file.path)
              return (
                <li key={index} data-testid="file-finding" data-severity={finding.severity} data-reviewer={finding.reviewer} data-disposition={finding.disposition}>
                  <span className="finding-severity">{finding.severity}</span>
                  {' '}<span data-testid="file-finding-reviewer">{finding.reviewer}</span>
                  {' '}· <span className="projects-muted">{finding.disposition}</span>
                  {' '}— <span data-testid="file-finding-message">{finding.message}</span>
                  {ranges.length > 0 && (
                    <>
                      {' '}
                      <button type="button" className="button button-small" data-testid="show-lines" onClick={() => showLines(ranges)}>
                        Show {ranges.map(rangeText).join(', ')}
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        ))}
      </section>

      <div className="task-toggle file-toggle" role="group" aria-label={`View of ${file.path}`}>
        {markdown ? (
          <>
            <button type="button" className="button button-small" aria-pressed={view === 'rendered'} onClick={() => setView('rendered')}>Rendered</button>
            <button type="button" className="button button-small" aria-pressed={view === 'source'} onClick={() => setView('source')}>Source</button>
          </>
        ) : (
          <button type="button" className="button button-small" aria-expanded={view !== 'hidden'} data-testid="file-source-toggle" onClick={() => setView(previous => previous === 'hidden' ? 'source' : 'hidden')}>
            {view === 'hidden' ? 'Show source' : 'Hide source'}
          </button>
        )}
      </div>
      {view !== 'hidden' && state.status === 'loading' && <LoadingPanel>Loading {file.path}…</LoadingPanel>}
      {view !== 'hidden' && state.status === 'error' && <ErrorPanel error={state.error} what={`The captured file ${file.path}`} onRetry={reload} />}
      {view !== 'hidden' && state.status === 'ready' && (
        state.data.length === 0
          ? <p className="projects-muted">This file is empty.</p>
          : view === 'rendered'
            ? <div className="task-rendered" data-testid="file-rendered"><Markdown content={state.data} /></div>
            : <SourceLines text={state.data} marked={marked} markRef={markRef} />
      )}
    </article>
  )
}

/** Scrolls to and focuses a file panel on this page without touching the history. */
function jumpToFile(event: MouseEvent<HTMLAnchorElement>, path: string) {
  const target = document.getElementById(fileAnchor(path))
  if (!target) return
  event.preventDefault()
  target.scrollIntoView({ block: 'start' })
  target.focus({ preventScroll: true })
}

function EntryStatus({ entry }: { entry: FileEntry }) {
  if (entry.captured !== null) return <span className="projects-muted"> · captured, shown below</span>
  if (entry.reason !== null) return <span className="projects-muted" data-testid="file-not-captured-reason"> · {NOT_CAPTURED_WORDING[entry.reason]}</span>
  return <span className="projects-muted"> · not captured (no reason recorded)</span>
}

/**
 * "Files created or changed" on a launch node: every changed file, with the captured text files shown inline (Markdown
 * rendered, other text as source on demand) and the others listed with the reason they were not captured. A result
 * recorded before capture existed says so instead.
 */
export function CreatedFiles({ scope, result, findings, focusPath, onFocusApplied }: Props) {
  const { recorded, entries } = fileCapture(result)
  const captured = entries.flatMap(entry => entry.captured === null ? [] : [entry.captured])
  const [activeFocus] = useState(() => focusPath)
  useEffect(() => {
    if (activeFocus === null) return
    const target = document.getElementById(fileAnchor(activeFocus))
    target?.scrollIntoView({ block: 'start' })
    target?.focus({ preventScroll: true })
    onFocusApplied()
  }, [activeFocus, onFocusApplied])

  return (
    <section className="evidence-section" aria-labelledby="evidence-files" data-testid="created-files" data-captured={recorded ? 'true' : 'false'}>
      <h4 id="evidence-files">Files created or changed</h4>
      {!recorded && (
        <p className="projects-muted" data-testid="created-files-not-captured">
          Created files were not captured for this run: its result predates file capture, so only the changed paths are listed.
        </p>
      )}
      {entries.length === 0 ? (
        <p className="projects-muted" data-testid="changed-files-empty">No changed files were recorded.</p>
      ) : (
        <ul className="evidence-list evidence-files" data-testid="changed-files">
          {entries.map(entry => (
            <li key={entry.path} data-path={entry.path} data-testid={entry.captured === null && entry.reason !== null ? 'file-not-captured' : undefined} data-reason={entry.reason ?? undefined}>
              {entry.captured !== null ? <a href={`#${fileAnchor(entry.path)}`} onClick={event => jumpToFile(event, entry.path)}><code>{entry.path}</code></a> : <code>{entry.path}</code>}
              {recorded && <EntryStatus entry={entry} />}
            </li>
          ))}
        </ul>
      )}
      {captured.map(file => <FilePanel key={file.artifactId} scope={scope} file={file} findings={findings} focused={file.path === activeFocus} />)}
    </section>
  )
}
