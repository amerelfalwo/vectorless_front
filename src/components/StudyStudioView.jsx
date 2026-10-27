import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  GraduationCap,
  Network,
  Sparkles,
  RefreshCw,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ArrowRight,
  Lightbulb,
  Check,
  RotateCw,
  FileText,
  Copy,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchMindMap, generateQuiz, listDocuments } from '../api/client.js'

/**
 * Utility to parse citation strings like '(Section: "Title", Page: 3)' into { section, page }
 */
function parseCitation(citationStr) {
  if (!citationStr) return { section: 'Document', page: 1 }
  const secMatch = citationStr.match(/Section:\s*"([^"]+)"/) || citationStr.match(/Section:\s*([^,)]+)/)
  const pageMatch = citationStr.match(/Page:\s*(\d+)/i)
  return {
    section: secMatch ? secMatch[1].trim() : 'Document Section',
    page: pageMatch ? parseInt(pageMatch[1], 10) : 1,
  }
}

/**
 * Extract verbatim document excerpt from evidence_text or matched mindmap node text
 */
function getExcerptForCitation(citationStr, evidenceText, mindmapNodes = []) {
  if (evidenceText && evidenceText.trim().length > 0) return evidenceText.trim()
  if (!citationStr) return null
  const parsed = parseCitation(citationStr)
  if (!parsed.section && !parsed.page) return null
  const cleanSec = (parsed.section || '').toLowerCase().trim()
  const matched = (mindmapNodes || []).find((n) => {
    const titleMatch =
      cleanSec &&
      ((n.section_title && n.section_title.toLowerCase().includes(cleanSec)) ||
        (n.label && n.label.toLowerCase().includes(cleanSec)))
    const pageMatch = n.page_number === parsed.page
    return titleMatch || (pageMatch && n.text)
  })
  return matched?.text || matched?.summary || null
}

export function StudyStudioView({
  docId,
  availableDocs = [],
  onSelectDoc,
  onJumpToSection,
  onAskAboutConcept,
}) {
  const [internalDocs, setInternalDocs] = useState([])

  // Self-heal: fetch ready documents directly on mount or when availableDocs is empty
  useEffect(() => {
    let active = true
    listDocuments()
      .then((res) => {
        if (!active) return
        const ready = (res.documents || []).filter((d) => d.status === 'ready')
        setInternalDocs(ready)
      })
      .catch((err) => console.warn('StudyStudioView listDocuments error:', err))
    return () => {
      active = false
    }
  }, [])

  const effectiveDocs = useMemo(() => {
    return availableDocs && availableDocs.length > 0 ? availableDocs : internalDocs
  }, [availableDocs, internalDocs])

  const [selectedDocId, setSelectedDocId] = useState(docId || effectiveDocs[0]?.doc_id || null)
  const [activeTab, setActiveTab] = useState('mindmap') // 'mindmap' | 'quiz'

  // Mind map state
  const [mindmapData, setMindmapData] = useState(null)
  const [loadingMindmap, setLoadingMindmap] = useState(false)
  const [selectedGraphNode, setSelectedGraphNode] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [zoomLevel, setZoomLevel] = useState(1.0)

  // Quiz state
  const [quizData, setQuizData] = useState(null)
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const [quizMode, setQuizMode] = useState('mcq') // 'mcq' | 'flashcards'
  const [mcqIndex, setMcqIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({}) // { [mcqId]: selectedOption }
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [masteredCards, setMasteredCards] = useState(new Set())

  // Keep selectedDocId synchronized with prop changes
  useEffect(() => {
    if (docId) {
      setSelectedDocId(docId)
    } else if (!selectedDocId && effectiveDocs.length > 0) {
      setSelectedDocId(effectiveDocs[0].doc_id)
    }
  }, [docId, effectiveDocs, selectedDocId])

  const currentDoc = useMemo(() => {
    return effectiveDocs.find((d) => d.doc_id === selectedDocId) || null
  }, [effectiveDocs, selectedDocId])

  // Load Mind Map
  const loadMindmap = useCallback(async (id) => {
    if (!id) return
    try {
      setLoadingMindmap(true)
      const data = await fetchMindMap(id)
      setMindmapData(data)
      // Default to root node or first chapter
      if (data?.nodes?.length > 0) {
        setSelectedGraphNode(data.nodes[0])
      }
    } catch (err) {
      console.error('Failed to load mind map:', err)
      toast.error('Could not load mind map for this document.')
    } finally {
      setLoadingMindmap(false)
    }
  }, [])

  // Load / Generate Quiz
  const loadQuiz = useCallback(async (id, forceRefresh = false) => {
    if (!id) return
    try {
      setLoadingQuiz(true)
      const data = await generateQuiz(id)
      setQuizData(data)
      setUserAnswers({})
      setMcqIndex(0)
      setFlashcardIndex(0)
      setIsFlipped(false)
      if (forceRefresh) {
        toast.success('Generated 5 fresh MCQs & 5 Flashcards!')
      }
    } catch (err) {
      console.error('Failed to generate quiz:', err)
      toast.error('Could not generate quiz. Please check API connection.')
    } finally {
      setLoadingQuiz(false)
    }
  }, [])

  // Fetch mind map when document changes
  useEffect(() => {
    if (selectedDocId) {
      loadMindmap(selectedDocId)
      loadQuiz(selectedDocId)
    }
  }, [selectedDocId, loadMindmap, loadQuiz])

  // Layout calculations for Mind Map visual graph
  const filteredNodes = useMemo(() => {
    if (!mindmapData?.nodes) return []
    if (!searchFilter.trim()) return mindmapData.nodes
    const q = searchFilter.toLowerCase()
    return mindmapData.nodes.filter(
      (n) =>
        (n.label || '').toLowerCase().includes(q) ||
        (n.section_title || '').toLowerCase().includes(q) ||
        (n.summary || '').toLowerCase().includes(q)
    )
  }, [mindmapData, searchFilter])

  // Group nodes by level for organized visual tiers
  const nodesByLevel = useMemo(() => {
    const groups = { 0: [], 1: [], 2: [], 3: [] }
    filteredNodes.forEach((node) => {
      const lvl = node.level ?? 1
      if (!groups[lvl]) groups[lvl] = []
      groups[lvl].push(node)
    })
    return groups
  }, [filteredNodes])

  // MCQ selection handler
  const handleSelectOption = (mcqId, option) => {
    if (userAnswers[mcqId]) return // already answered
    setUserAnswers((prev) => ({ ...prev, [mcqId]: option }))
  }

  // Flashcard toggle mastered
  const toggleMastered = (cardId) => {
    setMasteredCards((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  // Citation click handler (jumps directly to DocumentStructureExplorer)
  const handleCitationClick = (citationText) => {
    const parsed = parseCitation(citationText)
    toast.success(`Jumping to ${parsed.section} (Page ${parsed.page})`)
    if (onJumpToSection) {
      onJumpToSection(selectedDocId, parsed.section, parsed.page)
    }
  }

  if (!effectiveDocs || effectiveDocs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#FCFCFA]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F0E8] text-[#285943] mb-4 shadow-sm">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-[#262B27]">Study Studio</h2>
        <p className="mt-2 max-w-md text-sm text-[#777D76]">
          Upload and index a document first to unlock interactive Mind Maps, AI Quizzes, and
          active-recall Flashcards like NotebookLM.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#FCFCFA] text-[#262B27] relative">
      {/* Main Studio View Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {activeTab === 'mindmap' ? (
          /* ─────────────────────────────────────────────────────────────
             TAB A: INTERACTIVE MIND MAP
             ───────────────────────────────────────────────────────────── */
          <div className="flex flex-1 min-h-0 relative overflow-hidden">
            {/* Visual Canvas Area */}
            <div className="flex flex-1 flex-col overflow-auto p-8 bg-[#FAF9F5] relative select-none">
              {/* Floating Top Controls (Search, Zoom, Doc Selector & Mode Toggle) */}
              <div className="absolute top-4 left-6 right-6 z-10 flex items-center justify-between pointer-events-none gap-4">
                {/* Left Floating Controls: Search & Zoom */}
                <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#E4E5DE] bg-white/95 backdrop-blur-xs p-1.5 shadow-sm">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-[#777D76]" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search graph nodes..."
                      className="w-44 rounded-lg bg-[#F7F6F1] pl-8 pr-2.5 py-1 text-xs text-[#262B27] placeholder-[#A4A9A2] focus:outline-none"
                    />
                  </div>
                  <div className="h-4 w-[1px] bg-[#E4E5DE]" />
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
                    title="Zoom In"
                    className="rounded-lg p-1.5 text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27]"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                    title="Zoom Out"
                    className="rounded-lg p-1.5 text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27]"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomLevel(1.0)
                      setSearchFilter('')
                    }}
                    title="Reset View"
                    className="rounded-lg p-1.5 text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Right Floating Controls: Doc Dropdown & Mode Pill */}
                <div className="pointer-events-auto flex items-center gap-2.5">
                  {effectiveDocs.length > 0 && (
                    <div className="relative">
                      <select
                        value={selectedDocId || ''}
                        onChange={(e) => {
                          setSelectedDocId(e.target.value)
                          onSelectDoc?.(e.target.value)
                        }}
                        className="appearance-none rounded-xl border border-[#E4E5DE] bg-white/95 backdrop-blur-xs px-3.5 py-1.5 pr-8 text-xs font-medium text-[#262B27] shadow-sm hover:bg-[#F7F6F1] focus:outline-none focus:ring-1 focus:ring-[#285943]"
                      >
                        {effectiveDocs.map((doc) => (
                          <option key={doc.doc_id} value={doc.doc_id}>
                            📄 {doc.filename}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center rounded-xl border border-[#E4E5DE] bg-white/95 backdrop-blur-xs p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setActiveTab('mindmap')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        activeTab === 'mindmap'
                          ? 'bg-[#285943] text-white shadow-xs'
                          : 'text-[#777D76] hover:text-[#262B27]'
                      }`}
                    >
                      <Network className="h-3.5 w-3.5" />
                      <span>Interactive Mind Map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('quiz')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        activeTab === 'quiz'
                          ? 'bg-[#285943] text-white shadow-xs'
                          : 'text-[#777D76] hover:text-[#262B27]'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Quizzes & Flashcards</span>
                    </button>
                  </div>
                </div>
              </div>

              {loadingMindmap ? (
                <div className="flex flex-1 items-center justify-center">
                  <RefreshCw className="h-7 w-7 animate-spin text-[#285943]" />
                  <span className="ml-3 text-sm text-[#777D76]">Constructing tree mind map...</span>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center min-w-[700px] my-auto gap-8 transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                >
                  {/* Tier 0: Root Document Node */}
                  {nodesByLevel[0]?.map((node) => {
                    const isSelected = selectedGraphNode?.id === node.id
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedGraphNode(node)}
                        className={`cursor-pointer rounded-2xl border-2 px-6 py-4 text-center shadow-md transition-all ${
                          isSelected
                            ? 'border-[#285943] bg-[#E8F0E8] text-[#285943] ring-4 ring-[#285943]/15 scale-105'
                            : 'border-[#285943]/40 bg-white hover:border-[#285943] hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <BookOpen className="h-4 w-4 text-[#285943]" />
                          <h2 className="text-sm font-bold tracking-tight">{node.label}</h2>
                        </div>
                        <span className="mt-1 inline-block rounded-full bg-[#285943]/10 px-2 py-0.5 text-[10px] font-semibold text-[#285943]">
                          Document Root • Page {node.page_number}
                        </span>
                      </div>
                    )
                  })}

                  {/* Connecting Line Downward */}
                  <div className="h-6 w-0.5 bg-[#285943]/30" />

                  {/* Tier 1: Major Chapters & Dossier Core Themes */}
                  <div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl">
                    {nodesByLevel[1]?.map((node) => {
                      const isSelected = selectedGraphNode?.id === node.id
                      const isDossier = node.type === 'dossier'
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedGraphNode(node)}
                          className={`cursor-pointer rounded-xl border p-3.5 text-left shadow-xs transition-all w-60 ${
                            isSelected
                              ? 'border-[#285943] bg-[#E8F0E8] text-[#285943] ring-3 ring-[#285943]/15'
                              : isDossier
                              ? 'border-amber-200 bg-amber-50/70 hover:border-amber-400'
                              : 'border-[#E4E5DE] bg-white hover:border-[#285943]/50 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                isDossier
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-[#F0F2EB] text-[#285943]'
                              }`}
                            >
                              {isDossier ? 'Executive Dossier' : `Chapter • p.${node.page_number}`}
                            </span>
                            <ChevronRight className="h-3 w-3 text-[#777D76]" />
                          </div>
                          <h3 className="mt-1.5 text-xs font-semibold line-clamp-1">{node.label}</h3>
                          <p className="mt-1 text-[11px] text-[#777D76] line-clamp-2">
                            {node.summary || 'Click to view section contents and jump to page.'}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Connecting Line Downward */}
                  <div className="h-6 w-0.5 bg-[#285943]/20" />

                  {/* Tier 2: Sub-sections and Topics */}
                  <div className="flex flex-wrap items-center justify-center gap-3 max-w-5xl">
                    {nodesByLevel[2]?.map((node) => {
                      const isSelected = selectedGraphNode?.id === node.id
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedGraphNode(node)}
                          className={`cursor-pointer rounded-lg border px-3 py-2 text-left shadow-2xs transition-all w-48 ${
                            isSelected
                              ? 'border-[#285943] bg-[#E8F0E8] text-[#285943] ring-2 ring-[#285943]/20'
                              : 'border-[#E4E5DE] bg-white hover:border-[#285943]/40 hover:bg-[#FAF9F5]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[#777D76]">
                              p.{node.page_number}
                            </span>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#8DAA91]" />
                          </div>
                          <h4 className="mt-0.5 text-xs font-medium text-[#262B27] truncate">
                            {node.label}
                          </h4>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Node Inspector Drawer */}
            {selectedGraphNode && (
              <aside className="w-96 border-l border-[#E4E5DE] bg-white p-5 flex flex-col justify-between shadow-xs z-20">
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between border-b border-[#E4E5DE] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#E8F0E8] px-2.5 py-0.5 text-[11px] font-semibold text-[#285943]">
                        {selectedGraphNode.type.toUpperCase()}
                      </span>
                      <span className="rounded bg-[#F7F6F1] border border-[#E4E5DE] px-2 py-0.5 text-xs font-mono font-medium text-[#777D76]">
                        Page {selectedGraphNode.page_number}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedGraphNode(null)}
                      className="rounded-lg p-1 text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27] transition"
                      title="Close drawer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-[#262B27] leading-snug">
                    {selectedGraphNode.section_title || selectedGraphNode.label}
                  </h3>

                  {/* Real Document Text / Note content from File */}
                  <div className="mt-4 flex flex-col rounded-xl border border-[#E4E5DE] bg-[#FAF9F5] p-3.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-[#262B27] mb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-[#285943]" />
                        <span>نص المقطع من الملف (Document Text)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const text = selectedGraphNode.text || selectedGraphNode.summary || ''
                          navigator.clipboard.writeText(text)
                          toast.success('تم نسخ النص من الملف!')
                        }}
                        className="flex items-center gap-1 text-[11px] text-[#777D76] hover:text-[#285943] transition"
                        title="Copy text"
                      >
                        <Copy className="h-3 w-3" />
                        <span>نسخ</span>
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto rounded-lg bg-white p-3 border border-[#EBEBE6] text-xs leading-relaxed text-[#333834] whitespace-pre-wrap font-sans selection:bg-[#E8F0E8]">
                      {selectedGraphNode.text || selectedGraphNode.summary || 'لا يوجد نص متاح لهذا المقطع.'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-[#E4E5DE]">
                  <button
                    type="button"
                    onClick={() => {
                      if (onJumpToSection) {
                        onJumpToSection(
                          selectedDocId,
                          selectedGraphNode.section_title || selectedGraphNode.label,
                          selectedGraphNode.page_number,
                          selectedGraphNode.id
                        )
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#285943] hover:bg-[#1e4533] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition active:scale-[0.98]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Jump to Section in Explorer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onAskAboutConcept) {
                        onAskAboutConcept(selectedGraphNode.section_title || selectedGraphNode.label)
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#E4E5DE] bg-white hover:bg-[#F7F6F1] px-4 py-2 text-xs font-medium text-[#262B27] transition"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#285943]" />
                    <span>Research in Chat</span>
                  </button>
                </div>
              </aside>
            )}
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
             TAB B: QUIZZES & FLASHCARDS
             ───────────────────────────────────────────────────────────── */
          <div className="flex flex-1 min-h-0 flex-col overflow-auto bg-[#FCFCFA] p-6">
            {/* Top Bar for Quiz */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E5DE] pb-4 mb-6">
              <div className="flex items-center gap-3">
                {/* Mode Pill Toggle */}
                <div className="flex items-center rounded-xl border border-[#E4E5DE] bg-white p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('mindmap')}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#777D76] hover:text-[#262B27] transition"
                  >
                    <Network className="h-3.5 w-3.5" />
                    <span>Mind Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('quiz')}
                    className="flex items-center gap-1.5 rounded-lg bg-[#285943] px-3 py-1.5 text-xs font-medium text-white shadow-xs transition"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Quizzes & Flashcards</span>
                  </button>
                </div>

                {effectiveDocs.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedDocId || ''}
                      onChange={(e) => {
                        setSelectedDocId(e.target.value)
                        onSelectDoc?.(e.target.value)
                      }}
                      className="appearance-none rounded-xl border border-[#E4E5DE] bg-white px-3.5 py-1.5 pr-8 text-xs font-medium text-[#262B27] shadow-xs hover:bg-[#F7F6F1] focus:outline-none focus:ring-1 focus:ring-[#285943]"
                    >
                      {effectiveDocs.map((doc) => (
                        <option key={doc.doc_id} value={doc.doc_id}>
                          📄 {doc.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sub-mode selector (MCQs vs Flashcards) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuizMode('mcq')}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                    quizMode === 'mcq'
                      ? 'bg-[#285943] text-white shadow-xs'
                      : 'bg-white border border-[#E4E5DE] text-[#777D76] hover:text-[#262B27]'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>5 Multiple Choice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuizMode('flashcards')}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                    quizMode === 'flashcards'
                      ? 'bg-[#285943] text-white shadow-xs'
                      : 'bg-white border border-[#E4E5DE] text-[#777D76] hover:text-[#262B27]'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span>5 Flashcards</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => loadQuiz(selectedDocId, true)}
                disabled={loadingQuiz}
                className="flex items-center gap-2 rounded-xl border border-[#E4E5DE] bg-white px-3 py-1.5 text-xs font-medium text-[#262B27] hover:bg-[#F7F6F1] transition shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingQuiz ? 'animate-spin' : ''}`} />
                <span>Regenerate Study Set</span>
              </button>
            </div>

            {loadingQuiz ? (
              <div className="flex flex-1 flex-col items-center justify-center my-16">
                <RefreshCw className="h-8 w-8 animate-spin text-[#285943]" />
                <p className="mt-3 text-sm font-medium text-[#262B27]">
                  Synthesizing questions from document hierarchy & dossier...
                </p>
                <p className="text-xs text-[#777D76]">Grounding citations with page numbers</p>
              </div>
            ) : quizMode === 'mcq' ? (
              /* MCQ VIEW */
              <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
                {quizData?.mcqs && quizData.mcqs.length > 0 ? (
                  (() => {
                    const currentMcq = quizData.mcqs[mcqIndex] || quizData.mcqs[0]
                    const selectedChoice = userAnswers[currentMcq.id]
                    const isAnswered = selectedChoice !== undefined
                    const isCorrect = isAnswered && selectedChoice === currentMcq.answer

                    return (
                      <div className="rounded-2xl border border-[#E4E5DE] bg-white p-6 shadow-xs">
                        {/* Question Header */}
                        <div className="flex items-center justify-between border-b border-[#E4E5DE] pb-3 mb-4">
                          <span className="text-xs font-bold text-[#285943] tracking-wider uppercase">
                            Question {mcqIndex + 1} of {quizData.mcqs.length}
                          </span>
                          <span className="text-xs text-[#777D76]">
                            Score: {Object.entries(userAnswers).filter(([id, ans]) => {
                              const q = quizData.mcqs.find((m) => m.id === id)
                              return q && q.answer === ans
                            }).length} / {quizData.mcqs.length}
                          </span>
                        </div>

                        {/* Question Text */}
                        <h3 className="text-base font-semibold text-[#262B27] leading-relaxed mb-6">
                          {currentMcq.question}
                        </h3>

                        {/* Options List */}
                        <div className="flex flex-col gap-3">
                          {currentMcq.options?.map((option, optIdx) => {
                            const isThisSelected = selectedChoice === option
                            const isThisCorrect = option === currentMcq.answer

                            let btnStyle = 'border-[#E4E5DE] bg-[#FDFDFD] hover:bg-[#F7F6F1] text-[#262B27]'
                            if (isAnswered) {
                              if (isThisCorrect) {
                                btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                              } else if (isThisSelected) {
                                btnStyle = 'border-red-400 bg-red-50 text-red-900'
                              } else {
                                btnStyle = 'border-[#E4E5DE] bg-[#FDFDFD] opacity-60'
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isAnswered}
                                onClick={() => handleSelectOption(currentMcq.id, option)}
                                className={`flex items-center justify-between rounded-xl border p-4 text-left text-sm font-medium transition active:scale-[0.99] ${btnStyle}`}
                              >
                                <span>{option}</span>
                                {isAnswered && isThisCorrect && (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 ml-2" />
                                )}
                                {isAnswered && isThisSelected && !isThisCorrect && (
                                  <XCircle className="h-5 w-5 text-red-500 shrink-0 ml-2" />
                                )}
                              </button>
                            )
                          })}
                        </div>

                        {/* Explanation & Real Document Text (نص الملف) */}
                        {isAnswered && (
                          <div className="mt-6 rounded-xl bg-[#F7F6F1] p-4 text-xs leading-relaxed border border-[#E4E5DE]">
                            <div className="flex items-center gap-1.5 font-semibold text-[#262B27] mb-1">
                              <Lightbulb className="h-4 w-4 text-amber-600" />
                              <span>Explanation & Evidence</span>
                            </div>
                            <p className="text-[#5A6059] mb-3">{currentMcq.explanation}</p>

                            {/* Real Document Text / Evidence from File */}
                            {(() => {
                              const excerpt = getExcerptForCitation(
                                currentMcq.citation,
                                currentMcq.evidence_text,
                                mindmapData?.nodes || []
                              )
                              if (!excerpt) return null
                              return (
                                <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50/80 p-3 text-xs">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                                      <FileText className="h-3.5 w-3.5 text-emerald-700" />
                                      <span>نص الملف الأصلي (Document Excerpt):</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(excerpt)
                                        toast.success('تم نسخ نص الملف!')
                                      }}
                                      className="flex items-center gap-1 text-[11px] text-emerald-800 hover:text-emerald-950 transition"
                                      title="Copy document excerpt"
                                    >
                                      <Copy className="h-3 w-3" />
                                      <span>نسخ النص</span>
                                    </button>
                                  </div>
                                  <p className="max-h-48 overflow-y-auto whitespace-pre-wrap font-serif text-emerald-950 italic leading-relaxed text-xs selection:bg-emerald-200">
                                    "{excerpt}"
                                  </p>
                                </div>
                              )
                            })()}

                            {/* Clickable Citation Badge */}
                            {currentMcq.citation && (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-[#777D76]">Source Grounding:</span>
                                <button
                                  type="button"
                                  onClick={() => handleCitationClick(currentMcq.citation)}
                                  className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition active:scale-95"
                                >
                                  <span>{currentMcq.citation}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#E4E5DE]">
                          <button
                            type="button"
                            onClick={() => setMcqIndex((i) => Math.max(0, i - 1))}
                            disabled={mcqIndex === 0}
                            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-[#777D76] hover:bg-[#F7F6F1] disabled:opacity-40"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Previous</span>
                          </button>

                          <div className="flex gap-1.5">
                            {quizData.mcqs.map((m, i) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setMcqIndex(i)}
                                className={`h-2.5 w-2.5 rounded-full transition ${
                                  i === mcqIndex
                                    ? 'bg-[#285943] ring-2 ring-[#285943]/20 scale-125'
                                    : userAnswers[m.id]
                                    ? 'bg-emerald-400'
                                    : 'bg-[#D1D5CB]'
                                }`}
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setMcqIndex((i) => Math.min(quizData.mcqs.length - 1, i + 1))
                            }
                            disabled={mcqIndex === quizData.mcqs.length - 1}
                            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-[#285943] hover:bg-[#E8F0E8] disabled:opacity-40"
                          >
                            <span>Next</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <p className="text-center text-sm text-[#777D76]">No questions available yet.</p>
                )}
              </div>
            ) : (
              /* FLASHCARDS VIEW */
              <div className="mx-auto w-full max-w-lg flex flex-col items-center gap-6">
                {quizData?.flashcards && quizData.flashcards.length > 0 ? (
                  (() => {
                    const card = quizData.flashcards[flashcardIndex] || quizData.flashcards[0]
                    const isMastered = masteredCards.has(card.id)

                    return (
                      <div className="w-full flex flex-col gap-4">
                        {/* Progress Bar & Header */}
                        <div className="flex items-center justify-between text-xs text-[#777D76] px-1">
                          <span className="font-semibold text-[#285943]">
                            Card {flashcardIndex + 1} of {quizData.flashcards.length}
                          </span>
                          <span>{masteredCards.size} of {quizData.flashcards.length} Mastered</span>
                        </div>

                        {/* Interactive 3D Flip Card */}
                        <div
                          onClick={() => setIsFlipped(!isFlipped)}
                          className="cursor-pointer min-h-[280px] rounded-2xl border-2 border-[#E4E5DE] bg-white p-8 shadow-md hover:border-[#285943]/40 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between border-b border-[#E4E5DE] pb-2 mb-4">
                              <span className="rounded-full bg-[#E8F0E8] px-2 py-0.5 text-[10px] font-bold text-[#285943]">
                                {isFlipped ? 'ANSWER & INSIGHT' : 'QUESTION / CONCEPT'}
                              </span>
                              <span className="text-xs text-[#777D76] flex items-center gap-1">
                                <RotateCw className="h-3 w-3" />
                                Click to Flip
                              </span>
                            </div>

                            {!isFlipped ? (
                              <h3 className="text-base font-bold text-[#262B27] leading-relaxed mt-4">
                                {card.question}
                              </h3>
                            ) : (
                              <div className="flex flex-col gap-3 mt-2">
                                <p className="text-sm font-semibold text-[#285943] leading-relaxed">
                                  {card.answer}
                                </p>
                                <p className="text-xs text-[#5A6059] leading-relaxed">
                                  {card.explanation}
                                </p>
                                {(() => {
                                  const excerpt = getExcerptForCitation(
                                    card.citation,
                                    card.evidence_text,
                                    mindmapData?.nodes || []
                                  )
                                  if (!excerpt) return null
                                  return (
                                    <div className="mt-1 rounded-lg border border-emerald-300 bg-emerald-50/75 p-2.5 text-xs text-left">
                                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
                                        <FileText className="h-3 w-3 text-emerald-700" />
                                        <span>نص الملف (Document Excerpt):</span>
                                      </div>
                                      <p className="max-h-36 overflow-y-auto whitespace-pre-wrap font-serif text-emerald-950 italic leading-relaxed text-xs">
                                        "{excerpt}"
                                      </p>
                                    </div>
                                  )
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Footer with Clickable Citation Badge */}
                          <div className="pt-4 border-t border-[#E4E5DE] flex items-center justify-between">
                            {card.citation && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCitationClick(card.citation)
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 transition"
                              >
                                <span>{card.citation}</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleMastered(card.id)
                              }}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                isMastered
                                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                                  : 'bg-[#F7F6F1] text-[#777D76] hover:text-[#262B27]'
                              }`}
                            >
                              {isMastered ? '✓ Mastered' : 'Mark Mastered'}
                            </button>
                          </div>
                        </div>

                        {/* Flashcard Navigation Controls */}
                        <div className="flex items-center justify-between px-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsFlipped(false)
                              setFlashcardIndex((i) => Math.max(0, i - 1))
                            }}
                            disabled={flashcardIndex === 0}
                            className="flex items-center gap-1.5 rounded-xl border border-[#E4E5DE] bg-white px-3.5 py-2 text-xs font-medium text-[#262B27] hover:bg-[#F7F6F1] disabled:opacity-40 shadow-xs"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Previous Card</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsFlipped(!isFlipped)}
                            className="rounded-xl border border-[#E4E5DE] bg-[#F7F6F1] px-4 py-2 text-xs font-semibold text-[#285943] hover:bg-[#E8F0E8] shadow-xs"
                          >
                            Flip Card
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsFlipped(false)
                              setFlashcardIndex((i) =>
                                Math.min(quizData.flashcards.length - 1, i + 1)
                              )
                            }}
                            disabled={flashcardIndex === quizData.flashcards.length - 1}
                            className="flex items-center gap-1.5 rounded-xl bg-[#285943] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1e4533] disabled:opacity-40 shadow-xs"
                          >
                            <span>Next Card</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <p className="text-center text-sm text-[#777D76]">No flashcards available yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
