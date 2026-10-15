import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FileText,
  UploadCloud,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  MessageSquare,
  Trash2,
  RefreshCw,
  Plus,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  listDocuments,
  uploadDocument,
  retryDocumentIndexing,
  deleteDocument,
  fetchDocumentStatus,
  fetchDocumentTree,
} from '../api/client.js'
import { DocumentStructureExplorer } from './DocumentStructureExplorer.jsx'
import { PRODUCT_CONFIG } from '../config/product.js'

export function DocumentLibrary({
  onSelectDocumentForChat,
}) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'ready' | 'indexing' | 'failed'
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgressMsg, setUploadProgressMsg] = useState('')
  const [selectedDocForTree, setSelectedDocForTree] = useState(null)
  const [docTreeData, setDocTreeData] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const fileInputRef = useRef(null)

  // Load documents from backend
  const refreshDocuments = useCallback(async () => {
    try {
      const res = await listDocuments()
      setDocuments(res.documents || [])
    } catch (err) {
      console.warn('Failed to fetch documents:', err)
      toast.error('Could not load documents from server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    listDocuments()
      .then((res) => {
        if (active) setDocuments(res.documents || [])
      })
      .catch((err) => {
        console.warn('Failed to fetch documents:', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])


  // Polling for active indexing documents
  useEffect(() => {
    const hasIndexing = documents.some((d) => d.status === 'indexing')
    if (!hasIndexing) return

    const timer = setInterval(() => {
      refreshDocuments()
    }, 2000)

    return () => clearInterval(timer)
  }, [documents, refreshDocuments])

  // Handle direct file upload
  const handleUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a valid PDF document.')
      return
    }

    setIsUploading(true)
    setUploadProgressMsg('Uploading document bytes...')

    try {
      const res = await uploadDocument(file, null, {
        onSent: () => setUploadProgressMsg('Building hierarchical section tree...'),
      })

      toast.success(`Uploaded "${file.name}"`)
      refreshDocuments()

      // Poll until ready
      const docId = res.document_id || res.doc_id
      if (res.status !== 'ready') {
        const check = setInterval(async () => {
          try {
            const st = await fetchDocumentStatus(docId)
            if (st.status === 'ready' || st.status === 'failed') {
              clearInterval(check)
              refreshDocuments()
              if (st.status === 'ready') {
                toast.success(`Index ready: ${file.name}`)
              } else {
                toast.error(`Indexing failed: ${st.error || 'Unknown error'}`)
              }
            }
          } catch {
            clearInterval(check)
          }
        }, 1500)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to upload document.')
    } finally {
      setIsUploading(false)
      setUploadProgressMsg('')
    }
  }

  // Handle retry
  const handleRetry = async (docId, filename) => {
    try {
      await retryDocumentIndexing(docId)
      toast.info(`Restarted indexing for "${filename}"`)
      refreshDocuments()
    } catch (err) {
      console.error(err)
      toast.error('Failed to restart indexing.')
    }
  }

  // Handle delete
  const handleDelete = async (docId) => {
    try {
      await deleteDocument(docId)
      toast.success('Document deleted.')
      setDeleteConfirmId(null)
      if (selectedDocForTree?.doc_id === docId) {
        setSelectedDocForTree(null)
        setDocTreeData(null)
      }
      refreshDocuments()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete document.')
    }
  }

  // Open tree explorer for a document
  const handleInspectTree = async (doc) => {
    setSelectedDocForTree(doc)
    try {
      const res = await fetchDocumentTree(doc.doc_id)
      setDocTreeData(res.tree)
    } catch (err) {
      console.warn('Could not load tree:', err)
      toast.error('Document tree not ready or unavailable.')
      setDocTreeData([])
    }
  }


  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = (doc.filename || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false

      if (statusFilter === 'all') return true
      return doc.status === statusFilter
    })
  }, [documents, searchQuery, statusFilter])

  // Inventory stats
  const stats = useMemo(() => {
    const total = documents.length
    const ready = documents.filter((d) => d.status === 'ready').length
    const indexing = documents.filter((d) => d.status === 'indexing').length
    const failed = documents.filter((d) => d.status === 'failed').length
    const totalPages = documents.reduce((acc, d) => acc + (d.page_count || 0), 0)
    return { total, ready, indexing, failed, totalPages }
  }, [documents])

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-[#F7F6F1]">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Page Header */}
        <header className="border-b border-[#E4E5DE] bg-white px-6 py-6 md:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#262B27]">
                  Document Library
                </h1>
                <span className="rounded-full bg-[#E8F0E8] px-2.5 py-0.5 text-xs font-medium text-[#285943]">
                  {stats.total} {stats.total === 1 ? 'file' : 'files'}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#777D76]">
                Manage ingested knowledge sources, inspect hierarchical tree structures, and launch grounded research.
              </p>
            </div>

            {/* Quick Upload Action */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 rounded-xl bg-[#285943] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1e4533] active:scale-98 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Upload PDF Document</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#E4E5DE] bg-[#F7F6F1] p-3 text-xs">
              <span className="text-[#777D76]">Total Ingested</span>
              <p className="mt-1 font-serif text-lg font-semibold text-[#262B27]">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E5DE] bg-[#F7F6F1] p-3 text-xs">
              <span className="text-[#777D76]">Ready for Research</span>
              <p className="mt-1 font-serif text-lg font-semibold text-[#285943]">
                {stats.ready}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E5DE] bg-[#F7F6F1] p-3 text-xs">
              <span className="text-[#777D76]">Total Pages Indexed</span>
              <p className="mt-1 font-serif text-lg font-semibold text-[#262B27]">
                {stats.totalPages}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E5DE] bg-[#F7F6F1] p-3 text-xs">
              <span className="text-[#777D76]">Retrieval Engine</span>
              <p className="mt-1 font-mono text-xs font-semibold text-[#777D76] truncate">
                {PRODUCT_CONFIG.technology}
              </p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-10">
          {/* Upload Dropzone Banner */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file) handleUpload(file)
            }}
            onClick={() => fileInputRef.current?.click()}
            className="group relative mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D0D2C7] bg-white p-6 text-center transition hover:border-[#285943] hover:bg-[#FDFBF7]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F6F1] text-[#285943] transition group-hover:bg-[#E8F0E8]">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-2 text-sm font-medium text-[#262B27]">
              Drag and drop PDF files here, or <span className="text-[#285943] underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-[#777D76]">
              Documents are processed into deterministic hierarchical sections without vectors.
            </p>
            {isUploading && uploadProgressMsg ? (
              <div className="mt-3 flex items-center gap-2 rounded-full bg-[#E8F0E8] px-3 py-1 text-xs text-[#285943]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{uploadProgressMsg}</span>
              </div>
            ) : null}
          </div>

          {/* Search & Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#777D76]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by filename..."
                className="w-full rounded-xl border border-[#E4E5DE] bg-white pl-9 pr-4 py-2 text-sm text-[#262B27] placeholder:text-[#777D76] focus:border-[#285943] focus:outline-none"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-[#E4E5DE] bg-white p-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'ready', label: 'Ready' },
                { id: 'indexing', label: 'Indexing' },
                { id: 'failed', label: 'Failed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    statusFilter === tab.id
                      ? 'bg-[#285943] text-white shadow-xs'
                      : 'text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Document Table / List */}
          <div className="overflow-hidden rounded-2xl border border-[#E4E5DE] bg-white shadow-xs">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-[#777D76]">
                <Loader2 className="h-6 w-6 animate-spin text-[#285943]" />
                <p className="mt-2 text-sm">Loading document inventory...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="h-10 w-10 text-[#D0D2C7] mb-2" />
                <h3 className="text-sm font-semibold text-[#262B27]">No documents found</h3>
                <p className="mt-1 text-xs text-[#777D76] max-w-sm">
                  {searchQuery
                    ? 'No document matches your search term.'
                    : 'Upload your first PDF document to start exploring structured knowledge.'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 flex items-center gap-1.5 rounded-lg border border-[#E4E5DE] bg-[#F7F6F1] px-3 py-1.5 text-xs font-medium text-[#262B27] hover:bg-[#E8F0E8] hover:text-[#285943]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Upload PDF
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E5DE] bg-[#F7F6F1] text-[11px] font-semibold uppercase tracking-wider text-[#777D76]">
                      <th className="py-3 pl-4 pr-3">Document</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Pages</th>
                      <th className="px-3 py-3">Sections</th>
                      <th className="px-3 py-3">Method</th>
                      <th className="px-3 py-3">Duration</th>
                      <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E5DE]">
                    {filteredDocuments.map((doc) => {
                      const isReady = doc.status === 'ready'
                      const isIndexing = doc.status === 'indexing'
                      const isFailed = doc.status === 'failed'

                      return (
                        <tr
                          key={doc.doc_id}
                          className="group transition hover:bg-[#FDFBF7]"
                        >
                          <td className="py-3 pl-4 pr-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E5DE] bg-[#F7F6F1] text-[#285943]">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-sm text-[#262B27]" title={doc.filename}>
                                  {doc.filename || 'document.pdf'}
                                </p>
                                <p className="font-mono text-[10px] text-[#777D76]">
                                  ID: {doc.doc_id.slice(0, 8)}…
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap">
                            {isReady && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F0E8] px-2.5 py-0.5 text-[11px] font-medium text-[#285943]">
                                <CheckCircle2 className="h-3 w-3" />
                                Ready
                              </span>
                            )}
                            {isIndexing && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-[#B78A45]">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {doc.current_stage || 'Indexing'}
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-700">
                                <AlertCircle className="h-3 w-3" />
                                Failed
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-3 font-mono text-[#262B27] whitespace-nowrap">
                            {doc.page_count || '—'}
                          </td>

                          <td className="px-3 py-3 font-mono text-[#262B27] whitespace-nowrap">
                            {doc.section_count || '—'}
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-mono text-[10px] text-[#777D76] bg-[#F7F6F1] px-1.5 py-0.5 rounded border border-[#E4E5DE]">
                              {doc.indexing_method || 'tree-index'}
                            </span>
                          </td>

                          <td className="px-3 py-3 font-mono text-[#777D76] whitespace-nowrap">
                            {doc.duration != null ? `${Number(doc.duration).toFixed(1)}s` : '—'}
                          </td>

                          <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Chat with Doc */}
                              {isReady && onSelectDocumentForChat && (
                                <button
                                  type="button"
                                  onClick={() => onSelectDocumentForChat(doc.doc_id, doc.filename)}
                                  title="Research this document"
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#285943] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[#1e4533] active:scale-95 shadow-xs"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  <span>Research</span>
                                </button>
                              )}

                              {/* Inspect Tree */}
                              {isReady && (
                                <button
                                  type="button"
                                  onClick={() => handleInspectTree(doc)}
                                  title="Inspect section tree structure"
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#E4E5DE] bg-white px-2 py-1 text-xs font-medium text-[#262B27] transition hover:bg-[#F7F6F1] hover:border-[#8DAA91]"
                                >
                                  <FolderTree className="h-3 w-3 text-[#285943]" />
                                  <span className="hidden md:inline">Structure</span>
                                </button>
                              )}

                              {/* Retry if failed */}
                              {isFailed && (
                                <button
                                  type="button"
                                  onClick={() => handleRetry(doc.doc_id, doc.filename)}
                                  title="Retry document indexing"
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  <span>Retry</span>
                                </button>
                              )}

                              {/* Delete confirmation button */}
                              {deleteConfirmId === doc.doc_id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(doc.doc_id)}
                                    className="rounded bg-red-600 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-red-700"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="rounded border border-[#E4E5DE] bg-white px-2 py-1 text-[11px] text-[#777D76] hover:bg-[#F7F6F1]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(doc.doc_id)}
                                  title="Delete document"
                                  className="rounded-lg p-1.5 text-[#777D76] transition hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Side Structure Explorer Drawer if opened from library */}
      {selectedDocForTree && (
        <DocumentStructureExplorer
          tree={docTreeData || []}
          docName={selectedDocForTree.filename}
          docId={selectedDocForTree.doc_id}
          onClose={() => {
            setSelectedDocForTree(null)
            setDocTreeData(null)
          }}
          onAskSection={(node) => {
            if (onSelectDocumentForChat) {
              onSelectDocumentForChat(
                selectedDocForTree.doc_id,
                selectedDocForTree.filename,
                `Please explain the section "${node.title || node.name}" in detail.`
              )
            }
          }}
        />
      )}
    </div>
  )
}
