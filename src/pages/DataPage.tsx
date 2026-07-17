import BackupRestore from '../components/BackupRestore'
import ImportPanel from '../components/ImportPanel'

// Data & backup: everything in Tilth lives in the browser (IndexedDB), which a browser may
// clear when space is tight. The exported JSON is the durable copy — this page is where you
// make and restore it.
export default function DataPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-display font-semibold tracking-tight">Data</h1>
        <p className="text-sm text-muted">
          Tilth keeps everything on this device, in the browser. Save a backup regularly so you
          never lose your plants and garden.
        </p>
      </div>
      <div className="flex max-w-2xl flex-col gap-5">
        <BackupRestore />
        <ImportPanel />
      </div>
    </div>
  )
}
