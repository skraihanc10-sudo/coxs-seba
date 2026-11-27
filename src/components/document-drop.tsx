"use client"

import { useRef, useState } from "react"
import { FileText, ImagePlus, X } from "lucide-react"

/**
 * A friendly file picker for identity papers: tap to choose (or shoot) up to
 * two photos or PDFs, see what you picked, remove one. The real <input> stays
 * in the form so the server action receives the files as usual.
 */
export function DocumentDrop({ name, label, hint, note, choose, empty, max = 2, required = true }: { name: string; label: string; hint: string; note: string; choose: string; empty: string; max?: number; required?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])

  const sync = (next: File[]) => {
    const kept = next.slice(0, max)
    const dt = new DataTransfer()
    kept.forEach((f) => dt.items.add(f))
    if (input.current) input.current.files = dt.files
    setFiles(kept)
  }

  return (
    <div>
      <p className="label">{label}</p>
      <input ref={input} type="file" name={name} accept="image/*,application/pdf" multiple required={required} className="sr-only" tabIndex={-1} onChange={(e) => sync([...files, ...Array.from(e.target.files ?? [])])} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={files.length >= max}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft/60 px-4 py-5 text-sm font-extrabold text-brand transition hover:border-brand hover:bg-brand-soft disabled:cursor-default disabled:opacity-60"
      >
        <ImagePlus className="size-5" aria-hidden /> {choose} ({files.length}/{max})
      </button>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <ul className="mt-2 space-y-1.5">
        {!files.length ? <li className="text-xs text-muted-foreground">{empty}</li> : null}
        {files.map((f, i) => (
          <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm">
            {f.type === "application/pdf" ? <FileText className="size-4 shrink-0 text-brand" aria-hidden /> : <Thumb file={f} />}
            <span className="min-w-0 flex-1 truncate font-bold text-ink">{f.name}</span>
            <span className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
            <button type="button" aria-label="remove" onClick={() => sync(files.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-white hover:text-ink"><X className="size-4" /></button>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  )
}

function Thumb({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file))
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-line" />
}
